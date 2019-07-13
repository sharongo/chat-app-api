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
    var channelName = req.body.name
    var uuid = uuidv4()
    var newChannel = {
        id: uuid,
        name: req.body.name,
        details: req.body.details,
        createdBy: req.body.createdBy
    }

    client.lpush('channels', channelName, function (err, reply) {
        if (err) {
            res.status(400).json(err);
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
})


app.get('/api/channels/getchannels', function (req, res) {
    const channelsToReturn = []
    client.lrange('channels', 0, -1, function (err, channels) {
        if (err) {
            res.status(400).json(err);
        }

        channels.forEach(function(name) {
            client.hgetall('channel:' + name, function (err, channel) {
                if(err){
                    res.status(400).json(err);
                }
                const channelToAdd = {
                    id: channel.id,
                    name: channel.name,
                    details: channel.details,
                    createdBy: channel.createdBy
                }
                channelsToReturn.push(channelToAdd)
                if(channels.length == channelsToReturn.length){
                    res.json(channelsToReturn)
                }
            })
        })
    })
})

app.post('/api/messages/addmessage', function(req, res){
    var channelId = req.body.channelId;
    var messageId = uuidv4();
    var timestamp = Date.now()
    var messageToAdd = {
        id: messageId,
        time: new Date(timestamp),
        channelId: channelId,
        user: req.body.user,
        content: req.body.content
    }
    client.lpush(channelId, messageId, function(err, replay){
        if(err){
            res.status(400).json(err);
        }
        client.hmset(`message:${messageId}`, [
            'id', messageToAdd.id,
            'time', messageToAdd.time,
            'channelId', messageToAdd.channelId,
            'user', messageToAdd.user,
            'content', messageToAdd.content
        ], function (err, reply) {
            if (err) {
                res.status(400).json(err);
            }
            res.json(messageToAdd);
        })
    })
})


app.get('/api/messages/getmessages/:channelId', function(req, res){
    const messagesToReturn = [];
    //var channelId = req.params.channelId.substring(1, req.params.channelId.length -1)
    var channelId = req.params.channelId

    client.lrange(channelId, 0, -1, function(err, messagesIds){
        if(err){
            res.status(400).json(err);
        }
        messagesIds.forEach(function(id){
            client.hgetall(`message:${id}`, function(err, message){
                if(err){
                    res.status(400).json(err);
                }
                const messageToAdd = {
                    id: message.id,
                    tiem: message.time,
                    channelId: message.channelId,
                    user: message.user,
                    content: message.content
                }
                messagesToReturn.push(messageToAdd);
                if(messagesIds.length == messagesToReturn.length){
                    res.json(messagesToReturn)
                }

            })
        })
    })

})





app.listen(5000);
console.log('Server Started On Port 5000...');

module.exports = app;