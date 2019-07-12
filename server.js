var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var redis = require('redis');
var cors = require('cors');
var uuidv4 = require('uuid/v4');

var app = express();

// Create Client
var client = redis.createClient();

client.on('connect', function () {
    console.log('Redis Server Connected...');
});


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());



app.post('/api/users/register', function (req, res) {
    client.hmget(`user:${req.body.email}`, 'email', function (err, reply) {
        if (err) {
            console.log(err)
        }
        if (reply[0] === req.body.email) {
            res.status(400).json('Email already exists')
        }
        else {
            var newUser = {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password
            }

            client.hmset(`user:${newUser.email}`,
                [
                    'username', newUser.username,
                    'email', newUser.email,
                    'password', newUser.password
                ], function (err, reply) {
                    if (err) {
                        res.status(400).json(err);
                    }
                    var data = {
                        username: req.body.username,
                        email: req.body.email
                    }
                    res.json(data)
                })
        }
    })
})

app.post('/api/users/login', function (req, res) {
    client.hmget(`user:${req.body.email}`, 'email', 'password', function (err, reply) {
        if (err) {
            res.status(400).json(err);
        }
        if (reply[0] === req.body.email && reply[1] === req.body.password) {
            client.hget(`user:${req.body.email}`, 'username', function (error, username) {
                if (error) {
                    res.status(400).json(error);
                }
                var data = {
                    username: username,
                    email: reply[0]
                }
                res.json(data)
            })
        }
        else {
            res.status(400).json("Invalid Credentials");
        }

    })
})

app.post('/api/channels/addchannel', function (req, res) {
    var uuid = uuidv4()
    var newChannel = {
        id: uuid,
        name: req.body.name,
        details: req.body.details,
        createdBy: req.body.createdBy
    }
    client.hmset(`channel:${req.body.name}`, [
        'id', newChannel.id,
        'name', newChannel.name,
        'details', newChannel.details,
        'createdBy', newChannel.createdBy
    ], function (err, reply) {
        if (err) {
            res.status(400).json(err);
        }
        res.json(newChannel);

    })
})

app.get('/api/channels/getchannels', function (req, res) {
    const channels = []
    client.scan('0', 'match', 'channel:*', 'count', '1000', function (err, reply) {
        if (err) {
            res.status(400).json(err);
        }
        const channelsNames = reply[1];
        

        // for(var i = 0; i < channelsNames.length; i++){
        //     client.hgetall(channelsNames[i], function(err, channel){
        //         const channelToAdd = {
        //             id: channel.id,
        //             name: channel.name,
        //             details: channel.details,
        //             createdBy: channel.createdBy
        //         }
        //         channels.push(channelToAdd)
                
        //     })
        // }

        channelsNames.forEach(function (name) {
            client.hgetall(name, function (err, channel) {
                const channelToAdd = {
                    id: channel.id,
                    name: channel.name,
                    details: channel.details,
                    createdBy: channel.createdBy
                }
                channels.push(channelToAdd)
                if(channels.length == channelsNames.length){
                    res.json(channels)
                }
                
            })
            
        })
        
        
        
    })
   
   
})





app.listen(5000);
console.log('Server Started On Port 5000...');

module.exports = app;