const Micronats = require('../lib/main')
const mn = new Micronats(/* options */)

mn.create({
    servicename : 'user-service-example',
    beforeCreate(){
        console.log('HOOK: before create.')
    },
    created(){
        console.log('HOOK: created')
    },
    mounted(){
        console.log('HOOK: mounted. All done. Service is ready')

        // Call local function
        this.$call.setTimestamp()
        
        // Talk to other services with
        mn.service.request('user-service-example.addUser', 
            { name : 'yamigr' }, 
            { max : 1}, 
            function(msg){
                console.log(msg)
        })

        mn.service.request('user-service-example.getAll', 
            {}, 
            { max : 1}, 
            function(msg){
                console.log(msg)
            })

        mn.service.request('user-service-example.delUser',
            {_id: '6oYDedYd'},
            { max : 1},
            function(msg){
                console.log(msg.err)
            })

        // Subscribe database events
        mn.service.subscribe('user-service-example.$storage.>', 
            function(msg, _, subject){
                console.log(subject, msg)
        })
    },
    destroyed(){
        console.log('HOOK service destroyed')
    },
    methods : {
        addUser(req, res){
            // add some service-methods
            // use this.$storage to store some data
            this.$storage.put(req, function(err){
                res({message : 'User added'})
            })
        },
        getAll(req, res){
            this.$storage.find({}, function(err, users){
                res({users : users})
            })
        },
        getUser(req, res){
            this.$storage.findOne(req._id, function(err, user){
                res({user : user})
            })
        },
        delUser(req, res){
            this.$storage.del(req._id, function(err){
                res({err : err})
            })
        }
    },
    funcs : {
        setTimestamp(){
           // call local-functions with this.$call
           // access local-variables with this.$data
           this.$data.timestamp = Date() 
        }
    },
    data(){
        // Local variables
        return {
            timestamp : Date()
        }
    }
})

///////////////////////////////////////////
// Listen runs the instances
mn.listen()

///////////////////////////////////////////
// Destroy a service by name
setTimeout(function(){
    mn.destroy('user-service')
}, 5000)

///////////////////////////////////////////
// Events
mn.on('err', function(err){
    console.log('error:', err)
})
mn.on('disconnect', function(err){
    console.log('disconnect')
})
mn.on('reconnecting', function(){
    console.log('reconnecting')
})
mn.on('reconnect', function(){
    console.log('reconnect')
})