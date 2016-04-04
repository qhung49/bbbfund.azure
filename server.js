'use strict';

var express = require('express');
var compression = require('compression');
var cors = require('cors');
var bodyParser = require('body-parser');

var authentication = require('./authentication');
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

authentication.setup(app);

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