var orgname = process.argv[2];
var username = process.argv[3];
var password = process.argv[4];
var number_of_records = process.argv.length>5 ? process.argv[5] : 10;
var mgmt_endpoint = "https://api.enterprise.apigee.com/v1/o/" +  orgname;
//Create products
var $auth = {
    'user': username,
    'pass': password,
};

var util = require("./util.js");

util.cleanupApps(mgmt_endpoint, $auth);
util.cleanupAPIProducts(mgmt_endpoint, $auth);
util.cleanupTestDevelopers(mgmt_endpoint, $auth);
