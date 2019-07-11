var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var redis = require('redis');
var cors = require('cors')

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

app.get('/', function (req, res) {
    var title = 'Task List';

    client.lrange('tasks', 0, -1, function (err, reply) {
        res.send({
            title: title,
            tasks: reply
        });
    });
});

app.post('/api/users/register', function (req, res) {
    client.hmget(`user:${req.body.email}`, 'email', function (err, reply) {
        if(err){
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
    client.hmget(`user:${req.body.email}`, 'email', 'password', function (err, reply){
        if(err){
            res.status(400).json(err);
        }
        if(reply[0] === req.body.email && reply[1] === req.body.password) {
            client.hget(`user:${req.body.email}`, 'username', function(error, username){
                if(error){
                    res.status(400).json(error);
                }
                var data = {
                    username: username,
                    email: reply[0]
                }
                res.json(data)
            })  
        }
        else{
            res.json("Invalid Credentials")
        }
        
    })
})



app.listen(5000);
console.log('Server Started On Port 5000...');

module.exports = app;