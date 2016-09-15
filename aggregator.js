var express = require('express');
var app = express();
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var async = require("async");
var util = require("./helper/util.js");

util.initialize(app);

$routes = [
    require('./routes/apiproducts.js'),
    require('./routes/apps.js'),
    require('./routes/developers.js')
];
Object.keys($routes).forEach(function($i){
    $routes[$i].set(app, util, async);
});
app.listen(9000);


