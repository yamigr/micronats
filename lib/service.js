
const nats = require('nats')
const level = require('level')
const Storage = require('./storage')
const EventEmitter = require('events').EventEmitter
const HOOKS = {
    beforeCreate : 'beforeCreate',
    created : 'created',
    mounted : 'mounted',
    destroyed : 'destroyed',
    methods : 'methods',
    functions : 'funcs',
    call : '$call',
    data : '$data',
    storage : '$storage'
}

/**
 * {Object} options { connection : { natsio specific options }, db : { level specific options } }
 */
class Micronats extends EventEmitter {
    constructor(options){
        super()
        this.options =  options || this.defaultOptions()
        this.storage = null
        this.service = null
        this.sid = {}
        this.$beforeCreate = {}
        this.$created = {}
        this.$mounted = {}
        this.$destroyed = {}
        this.$services = {}
        this.db = level(this.options.db.path, this.options.db.options)
    }

    create( opts ){
        if( typeof opts !== 'object'){
            throw Error("Options are not a object")
        }

        // Get the servicename and the key of the given object
        let preffix = opts.servicename

        // Create the data object for this service
        this.$beforeCreate[ preffix ] = opts[HOOKS.beforeCreate]
        this.$created[ preffix ] = opts[HOOKS.created]
        this.$mounted[ preffix ] = opts[HOOKS.mounted]
        this.$destroyed[ preffix ] = opts[HOOKS.destroyed]

        // Create the object for this service
        this.$services[preffix] = {}
        this.$services[preffix][HOOKS.call] = {}
        this.$services[preffix][HOOKS.data] = {}

        // Call function before creating
        this.$beforeCreate[ preffix ].call(this.$services[preffix])

        // Create the data
        this.$services[preffix][HOOKS.data] = typeof opts.data === 'function' ? opts.data.call() : {}

        // Bind the service objec to the methods
        for( let method in opts[HOOKS.methods]){
            this.$services[preffix][method] = opts[HOOKS.methods][method].bind(this.$services[preffix])
        }

        for( let method in opts[HOOKS.functions]){
            this.$services[preffix][HOOKS.call][method] = opts[HOOKS.functions][method].bind(this.$services[preffix])
        }

    }

    listen(){
        this.service = nats.connect(this.options.connection)
        this.eventHandler()
    }

    eventHandler(){
        let self = this
        // connect callback provides a reference to the connection as an argument
        this.service.on('connect', function(nc) {
            self.emit('connect', nc)

            nc.on('error', function(err) {
                self.emit('error', err)
            });

            // Created hooks
            for(let servicename in self.$created){
                self.$created[servicename].call(self.$services[servicename]);
            }

            // Subscribe methods, but not the call
            for(let servicename in self.$services){
                // Storage init
                self.$services[servicename][HOOKS.storage] = new Storage(self.db, nc, servicename)
                // Mehods init
                for( let methodname in self.$services[servicename]){
                    if( methodname === HOOKS.call ||  methodname === HOOKS.data ){
                        continue
                    }
                    self.sid[servicename + methodname] = nc.subscribe(servicename + '.' + methodname, function(msg, reply){
                        self.$services[servicename][methodname].call(self.$services[servicename], msg, function(data){
                            if( reply ){
                                nc.publish(reply, data)
                            }
                        })
                    });
                }
            }
            // Mounted hooks
            for(let servicename in self.$mounted){
                self.$mounted[servicename].call(self.$services[servicename]);
            }
        });
        
        // emitted whenever the client disconnects from a server
        this.service.on('disconnect', function() {
            self.emit('disconnect')
        });
        
        // emitted whenever the client is attempting to reconnect
        this.service.on('reconnecting', function() {
            self.emit('reconnecting')
        });
        
        // emitted whenever the client reconnects
        // reconnect callback provides a reference to the connection as an argument
        this.service.on('reconnect', function(nc) {
            self.emit('reconnect', nc)
        });
    }

    destroy( servicename ){
        // Call destroyed
        if(typeof this.$destroyed[ servicename ] === 'function'){
            this.$destroyed[ servicename ].call(this.$services[servicename])
        }

        // remove before create
        delete this.$beforeCreate[servicename]

        // remove created
        delete this.$created[servicename]

        // remove mounted
        delete this.$mounted[servicename]

        // remove methods and unsubscribe subscrib ids
        for(let methodname in this.$services[servicename]){
            if( methodname === HOOKS.call ||  methodname === HOOKS.data ){
                continue
            }
            this.service.unsubscribe(this.sid[servicename + methodname])
            delete this.sid[servicename + methodname]
        }

        delete this.$services[servicename]
    }

    defaultOptions(){
        return {
            connection : {
                json : true,
                port : 4222,
                servers : ['nats://nats.io:4222']
            },
            db : {
                path : './db',
                options : {
                    valueEncoding: 'json'
                }
            }
        }
    }
}

module.exports = Micronats