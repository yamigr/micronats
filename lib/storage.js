const EventEmitter = require('events').EventEmitter
const shortid = require('shortid');
const filtr = require("filtr");

class Storage extends EventEmitter {
    constructor(db, service, servicename){
        super()
        this.db = db
        this.service = service
        this.servicename = servicename + '.$storage'
    }

    put(value, options, cb ){
        let self = this
        let opts = options
        let callback = cb
        let db_key = 'put'
        if( !callback ){
            callback = opts
            opts = null
        }
        if(!callback){
            callback = function(){}
        }
        if( typeof callback !== 'function'){throw Error('Callback is not a function')}
        value._id = shortid.generate()
        this.db.put(value._id, value, opts, function(err){
            if( !err ){
                self.service.publish(self.createSubject(self.servicename, db_key, value._id), value)
            }
            callback.call(self, err, null)
        })
    }

    update(value, options, cb ){
        let self = this
        let opts = options
        let callback = cb
        let db_key = 'update'
        if( !callback ){
            callback = opts
            opts = null
        }
        if(!callback){
            callback = function(){}
        }
        if( typeof callback !== 'function'){throw Error('Callback is not a function')}
        if(!value._id){
            callback.call(self, 'Empty _id', null)
            return
        }
        this.db.get(value._id, function(err, old_val){
            if(err){
                callback.call(self, err, null)
                return
            }
            self.db.put(value._id, value, opts, function(err){
                if( !err ){
                    self.service.publish(self.createSubject(self.servicename, db_key, value._id), value)
                }
                callback.call(self, err, null)
            })
        })
    }

    batch(o, callback){
        let self = this
        let opts = o
        if( typeof callback !== 'function'){throw Error('Callback is not a function')}
        for(let i in opts){
            if(!opts[i].value){
                opts[i].value = {}
            }
            opts[i].key = shortid.generate()
            opts[i].value._id = opts[i].key
        }
        this.db.batch(opts, function (err) {
            if( !err ){
                for( let i in opts ){
                    if(typeof opts[i] === 'function'){
                        continue
                    }
                    self.service.publish(self.createSubject(self.servicename, opts[i].type, opts[i].key), opts[i].value)
                }
            }
            callback.call(self, err, null)
        })
    }

    findOne( key, callback ){
        let self = this
        if( typeof callback !== 'function'){throw Error('Callback is not a function')}
        if(!key){
            callback.call(self, 'Empty _id', null)
            return
        }
        this.db.get(key, function(err, value){
            callback.call(self, err, value)
        })
    }

    find(options, cb){
        let self = this
        let result = []
        let opts = options
        let callback = cb
        if( typeof opts === 'function' ){
            callback = opts
            opts = null
        }
        if( typeof callback !== 'function'){ throw Error('Callback is not a function')}
        let find_all = !options || Object.keys(options).length <= 0 
        this.db.createReadStream()
        .on('data', function (data) {
            if(find_all){
                result.push(data.value)
            }else{
                if(filtr(opts).test([data.value]).length){
                    result.push(data.value)
                }
            }
        })
        .on('error', function (err) {
            callback.call(self, err, null)
        })
        .on('close', function () {
        })
        .on('end', function () {
            callback.call(self, null, result)
        })
    }

    del(key, callback){
        let self = this
        let db_key = 'del'
        if( typeof callback !== 'function'){throw Error('Callback is not a function')}
        if(!key){
            callback.call(self, 'Empty _id', null)
            return
        }
        this.db.del(key, function (err) {
            if( !err ){
                self.service.publish(self.createSubject(self.servicename, db_key, key), key)
            }
            callback.call(self, err)
        });
    }

    createSubject(){
        return Object.values(arguments).join('.')
    }
}

module.exports = Storage