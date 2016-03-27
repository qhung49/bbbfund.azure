'use strict';

var express = require('express');
var compression = require('compression');
var cors = require('cors');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var routes = require('./routes');

var app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// dev only
if (app.get('env') !== 'production') {
  app.use(cors()); 
}

// Routing

var router = express.Router();
app.use('/', express.static('build'));

// Authentication
const users = [
  {
    id: 0,
    username: 'admin',
    password: process.env.user_admin_password,
    role: 'admin'
  },
  {
    id: 1,
    username: 'investor',
    password: process.env.user_investor_password,
    role: 'investor'
  },
];
var jwtSecret = process.env.jwt_secret || 'test secret';
var tokenExpireSeconds = 60*60*24; // token will expire in 1 day
app.use('/api/protected/', expressJwt({secret: jwtSecret}));

app.post('/authenticate', function(req, res, next) {
  //TODO validate req.body.username and req.body.password
  //if is invalid, return 401
  var user = users.find( u => u.username === req.body.username);
  if ( user && user.password === req.body.password) {
    // We are sending the profile inside the token
    var token = jwt.sign(user, jwtSecret, { expiresIn: tokenExpireSeconds });
    res.json({ 
      token: token,
      role: user.role 
    }); 
  }
  else {
    var err = new Error('Wrong username or password');
    err.status = 401;
    next(err);
  }
})

app.post('/refreshToken', function(req, res, next) {
  jwt.verify(req.body.token, jwtSecret, function(err, decoded) {
    if (err) {
      var err = new Error('Invalid token');
      err.status = 401;
      next(err);
    }
    else {
      var newToken = jwt.sign(decoded, jwtSecret, { expiresIn: tokenExpireSeconds });
      res.json({ 
        token: newToken,
        role: decoded.role 
      });
    }
  })
})

app.use('/api', routes);

// Error handling

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) { 
  res.status(err.status || 500);
  if (res.status === 500) {
    if (app.get('env') !== 'production') {
      err.message = "Internal Server Error";
    }
    else {
      // For dev environment, do not handle so it will be printed out
      next(err);
      return;
    }
  }
  res.json({
    error: err.message
  });
});

var port = process.env.PORT || 1337;
app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});