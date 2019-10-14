const Micronats = require('../lib/main')

/* options
{
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
*/

const micronats = new Micronats()


micronats.create({
    servicename : 'user-service',
    beforeCreate(){
        console.log('HOOK: before create.')
    },
    created(){
        console.log('HOOK: created')
    },
    mounted(){
        console.log(this.$data)
        console.log('HOOK: mounted. All done. Service is ready')
    },
    destroyed(){
        console.log('HOOK service destroyed')
    },
    methods : {
        addUser(req, res){
            // add some service-methods and handle the request and send a response
            // use this.$storage to store some data
            this.$storage.put(req, function(err){
                res({err : err})
            })
        },
        findUser(req, res){
            this.$storage.find(req, function(err, data){
                res({err : err, data : data})
            }) 
        },
        updateUser(req, res){
            this.$storage.update(req, function(err, data){
                res({err : err, data : data})
            }) 
        }
    },
    funcs : {
        setTimestamp(){
           // add some local-functions and call them with this.$call.setTimestamp() in other methods
           this.$data.timestamp = Date() 
        }
    },
    data(){
        return {
            timestamp : Date()
        }
    }
})


micronats.create({
    servicename : 'frontend-service',
    beforeCreate(){
        console.log('HOOK: before create.')
    },
    created(){
        console.log('HOOK: created')
    },
    mounted(){
        console.log('HOOK: mounted. All done. Service is ready')
        // Subscribe database events with ( you can use '>'or '*' for wildcard )
        micronats.service.subscribe('user-service.$storage.>', function(msg, _, subject){
            console.log('Database event from user-service:', subject, msg)
        })
        
        // Talk with other services with
        micronats.service.request('user-service.addUser', { name : 'yamigr', email : 'yamigr@42.com' }, { max : 1}, function(msg, _, subject){
            console.log('Response from user-service method addUser:', msg)
        })

        micronats.service.request('user-service.addUser', { name : 'joe', email : 'joe@42.com' }, { max : 1}, function(msg, _, subject){
            console.log('Response from user-service method addUser:', msg)
        })

        micronats.service.request('user-service.addUser', { name : 'yanosh', email : 'yanosh@42.com' }, { max : 1}, function(msg, _, subject){
            console.log('Response from user-service method addUser:', msg)
        })

        micronats.service.request('user-service.findUser', { name: { $in: ['yamigr', 'yanosh'] }} , { max : 1}, function(msg, _, subject){
            msg.data[0].name = 'Updated baaaaaaam'
            micronats.service.request('user-service.updateUser', msg.data[0] , { max : 1}, function(msg, _, subject){
                console.log('Response from user-service method find:', msg)
            })
        })

    },
    destroyed(){
        console.log('HOOK service destroyed')
    },
    methods : {
    },
    funcs : {
    },
    data(){
        return {
            timestamp : Date()
        }
    }
})


// Listen
micronats.listen()

// Destroy a service by name
setTimeout(function(){
    micronats.destroy('testservice')
}, 5000)

// Events
micronats.on('err', function(err){
    console.log('error:', err)
})

micronats.on('disconnect', function(err){
    console.log('disconnect')
})

micronats.on('reconnecting', function(){
    console.log('reconnecting')
})

micronats.on('reconnect', function(){
    console.log('reconnect')
})

