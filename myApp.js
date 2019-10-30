var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var dns = require("dns");

var app = express();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(bodyParser.urlencoded({ extended: true }));

var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("connected");

  // Schema & Methods
  var urlSchema = mongoose.Schema({
    original_url: String,
    short_url: Number
  });

  // methods
  urlSchema.methods.print = function(string) {
    var greeting = this.original_url ? this.original_url : "I don't exist";
    console.log(greeting + " " + string);
  };

  // Model
  var urlModel = mongoose.model("urlModel", urlSchema);

  // endPoint POST
  app.post("/api/shorturl/new", function(req, res, next) {
    
    // Check URL
    var regEx = /^https?:\/\//i;
    if (regEx.test(req.body.url)) {

      // Clear https?:// to dns Test
      let clear = req.body.url.match(regEx)[0].length;
      let reqUrl = req.body.url.split("");
      reqUrl = reqUrl.slice(clear).join("");

      // Check with dns
      var w3 = dns.lookup(reqUrl, function(err, addresses, family) {
        if (addresses !== undefined) {
          
          // Start the db work
          urlModel.findOne({ original_url: req.body.url }, function(err, data) {
            if (err) return console.error(err);
            if (!data) {
              urlModel.estimatedDocumentCount({}, function(err, count) {
                if (err) return console.error(err);
                let newURL = new urlModel({
                  original_url: req.body.url,
                  short_url: count + 1
                });
                newURL.save(function(err, data) {
                  if (err) return console.error(err);
                  res.json({
                    original_url: data.original_url,
                    short_url: data.short_url
                  });
                  data.print(" saved!!");
                });
              });
            } else {
              data.print(" exists!!");
              res.json({
                original_url: data.original_url,
                short_url: data.short_url
              });
            }
          });
        }else{ // URL Not exists
          res.json({"error":"invalid URL"})
        }
      });
    }else{ // type Error
      res.json({"error":"invalid URL"})
    }
  });

  // End Point GET
  app.get("/api/shorturl/:someNumber", function(req, res, next) {
    let shortUrl = req.params.someNumber;
    let regEx = /[^0-9]/g;
    if (regEx.test(shortUrl)) {
      res.json({ error: "Wrong Format" });
    }
    urlModel.findOne({ short_url: shortUrl }, function(err, data) {
      if (err) return next(err);
      if (!data) {
        res.json({ error: "No short url found for given input" });
      } else {
        res.redirect(data.original_url);
      }
    });
  });
});

//export
module.exports = app;
