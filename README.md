# Micronats

> MICRONATS :rocket: - A nats.io micro-service-framework for nodejs.

With this framework you can easily and very quickly create a micro-service for any requirement. :rainbow:

What's inside?
* Publish / Subscribe
* Request / Response
* Fast & simple data storage
* Database-Events

Dependencies
* NATS.io server [https://nats.io/download/](https://nats.io/download/)

## Content
* [Installing](#installing)
* [Use](#use)
* [Options](#options)
* [Service](#service)
* [$call](#call)
* [$data](#data)
* [$storage](#storage)
* [authors](#authors)
* [license](#license)

<a name="installing"></a>

## Installing
```sh
npm i micronats
```

<a name="use"></a>

## Use
Create a service. Define a servicename and add some methods to handle the requests or publishes.
Talk to the service with - **servicename.methodname**
Example subject - **user-service-example.addUser** to call the addUser-method from the user-service-example.

```js
const Micronats = require('micronats')
const micronats = new Micronats(/* options */)

micronats.create({
    servicename : 'user-service-example',
    beforeCreate(){
        console.log('HOOK: before create.')
    },
    created(){
        console.log('HOOK: created')
    },
    mounted(){
        console.log('HOOK: mounted. All done. Service is ready')
        this.$call.setTimestamp()
        // Talk to other services with
        micronats.service.request('user-service-example.addUser', 
            { name : 'yamigr' }, 
            { max : 1}, 
            function(msg, _, subject){
                console.log('Response from user-service method addUser:', msg)
        })
        // Subscribe database events with ( you can use '>'or '*' for wildcard )
        micronats.service.subscribe('user-service-example.$storage.>', 
            function(msg, _, subject){
                console.log('Database event from user-service-example:', subject, msg)
        })
    },
    destroyed(){
        console.log('HOOK service destroyed')
    },
    methods : {
        addUser(req, res){
            // add some service-methods and handle the request and send a response
            // use this.$storage to store some data
            this.$storage.put(req, function(err){
                res({message : 'User added'})
            })
        }
    },
    funcs : {
        setTimestamp(){
           // call local-functions with this.$call in other methods
           // access the variables in data with this.$data
           this.$data.timestamp = Date() 
        }
    },
    data(){
        // Use local variables with this.$data in other methods
        return {
            timestamp : Date()
        }
    }
})

///////////////////////////////////////////
// Listen runs the instances
micronats.listen()

///////////////////////////////////////////
// Destroy a service by name
setTimeout(function(){
    micronats.destroy('user-service')
}, 5000)

///////////////////////////////////////////
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
```

<a name="options"></a>

## Options

**Important** - Keep the json-options.
```js
let options = {
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
const micronats = new Micronats(options)

```
<a name="service"></a>

## Service

Publish, subscribe, request or response events. Read [https://www.npmjs.com/package/nats] for further informations.
Subscribe wildcard with '*' or '>'.
Or use a normal nats-cllient instance in another application.

```js
micronats.service.publish('servicename.methodname', {/* data */})

micronats.service.subscribe('servicename.$storage.eventname._id', function(msg, _, subject){
        console.log('Database event from user-service:', subject, msg)
})

micronats.service.request('servicename.methodname', function(msg, _, subject){
        console.log('Response from all servicename.methodname:', subject, msg)
})

micronats.service.requestOne('servicename.methodname', function(msg, _, subject){
        console.log('Response from one servicename.methodname:', subject, msg)
})
```

<a name="methods"></a>

## Methods
Methods are the service-handlers. To call a method from another service use the subject **servicename.methodname** and send the json-data. The data is assigned in req. When it's a request, it's possible to send some data back with res.
```js
addUser(req, res){
    // add some service-methods and handle the request and send a response
    this.$storage.put(req, function(err){
        res({message : 'User added'})
    })
}
```

<a name="call"></a>

## $call
Create some functions to call them in other methods.
```js
funcs : {
    setTimestamp(){
        // call local-functions with this.$call in other methods
        // access the variables in data with this.$data
        this.$data.timestamp = Date() 
    }
}
```

Access the functions in methods or other functions.
```js
this.$call.setTimestamp()
```

<a name="data"></a>

## $data
Create the data object to set some local variables.
```js
data(){
    // Use local variables with this.$data in other methods
    return {
        timestamp : Date()
    }
}
```

Access the variables in methods or functions.
```js
this.$data.timestamp
```

<a name="storage"></a>

## $storage
To store some data in the service use **this.$storage** in the methods. 
When someone put or delete a entry a event will be fired.

**servicename.$storage.update|put|del._id**

Insert single data
```js
// Object without _id
this.$storage.put({...}, function(err){
})

// Event from storage
micronats.service.subscribe('servicename.$storage.put._id', function(msg, _, subject){
        console.log('Database event:', subject, msg)
})
```

Insert multiple data
```js
// Handles a batch
var ops = [
  { type: 'put',  value: {}},
  { type: 'put',  value: {}},
  { type: 'put',  value: {}},
  { type: 'del',  key: _id},
]

this.$storage.batch( ops, function(err){
})

// Event from storage for each bach-entry
micronats.service.subscribe('servicename.$storage.put | del._id', function(msg, _, subject){
        console.log('Database event:', subject, msg)
})
```
Update a entry
```js
// Object needs to have the _id-prop
this.$storage.update({ _id : 'T4gbDiXx3', ...}, function(err){
})

// Event from storage
micronats.service.subscribe('servicename.$storage.update._id', function(msg, _, subject){
        console.log('Database event:', subject, msg)
})
```

Find one entry
```js
this.$storage.findOne(_id, function(err, doc){
    // returns a object
})
```

Find data
```js
// Mongodb-like find-filter
this.$storage.find( { name: { $in: ['yamigr', 'yanosh'] }}, function(err, docs){
    // returns a array of docs
})
```

Delete a entry by id
```js
this.$storage.del(_id, function(err){
})

// Event from storage
micronats.service.subscribe('servicename.$storage.del._id', function(msg, _, subject){
        console.log('Database event:', subject, msg)
})
```

<a name="authors"></a>

## Authors
* **Yannick Grund** - *Initial work* - [yamigr](https://github.com/yamigr)

<a name="license"></a>

## License

This project is licensed under the MIT License

