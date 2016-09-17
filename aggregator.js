var express = require('express');
var app = express();
var async = require("async");
var util = require("./helper/util.js");

//Ordering is relevant so that correct url patterns fire.

util.initialize(app);

require('./routes/apiproducts.js').routes(app, util, async);
require('./routes/keys.js').routes(app, util, async);
require('./routes/apps.js').routes(app, util, async);
require('./routes/developers.js').routes(app, util, async);

util.catch_all_route(app);

app.listen(9000);


