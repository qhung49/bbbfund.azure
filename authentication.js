'use strict';

var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

function setup(app) {
  // Authentication
  const users = [
    {
      id: 0,
      username: 'admin',
      password: process.env.user_admin_password || 'admin',
      role: 'admin'
    },
    {
      id: 1,
      username: 'investor',
      password: process.env.user_investor_password || 'investor',
      role: 'investor'
    },
  ];
  var jwtSecret = process.env.jwt_secret || 'test secret';
  var tokenExpireSeconds = 60*60*24; // token will expire in 1 day
  app.use('/api/protected/', expressJwt({secret: jwtSecret}));

  app.post('/authenticate', function(req, res, next) {
    //TODO validate req.body.username and req.body.password
    //if is invalid, return 401
    var user = users.find( u => u.username.toLowerCase() === req.body.username.toLowerCase());
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
}

module.exports.setup = setup;