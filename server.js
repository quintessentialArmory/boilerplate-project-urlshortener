'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');
var urlModule = require('url');
var URL = urlModule.URL;
var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
mongoose.connect(process.env.MONGO_URI);
var shortURLSchema = new mongoose.Schema({
  url: {type: String, required: true}
});
var ShortURL = mongoose.model('ShortURL', shortURLSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.post("/api/shorturl/new", function (req, res, next) {

  let hostname;
  try { hostname = new URL(req.body.url).hostname; }
  catch (e) { return next({
    status: 200,
    message: 'invalid URL'
  })}

  dns.lookup(hostname,
             function (lookupError, address, family) {

    if (lookupError) return next({
      status: 200,
      message: 'invalid Hostname'
    });

    let urlDoc = new ShortURL({url: req.body.url});

    urlDoc.save(function (error, data) {

      if (error) return next(error);

      res.json({
        original_url: req.body.url,
        short_url: data.id
      });
    });
  });
});

app.get("/api/shorturl/:id", function (req, res, next) {
  
  ShortURL.findById(req.params.id, function (error, urlDoc) {

    if (error) {
      if (error.name == 'CastError' &&
          error.kind == 'ObjectId' &&
          error.path == '_id') {
        return next({
          status: 404,
          message: "No short url found for given input"
        });
      }

      return next(error);
    }

    if (!urlDoc) return next({
      status: 404,
      message: "No short url found for given input"
    });

    res.set("Location", urlDoc.url);
    res.status(301).end();
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'});
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).json({error: errMessage});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});
