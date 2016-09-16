var express = require('express');
var app = express();
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

util.catch_all_route(app);

app.listen(9000);


