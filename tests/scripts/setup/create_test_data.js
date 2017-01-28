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

var util = require("./lib/util.js");

$count_of_products = util.createTestAPIProducts(mgmt_endpoint, $auth, orgname, number_of_records);
util.createTestDevelopers(mgmt_endpoint, $auth, number_of_records);

console.log("Count of products "  + $count_of_products);
util.createTestApps(mgmt_endpoint, $auth, orgname, $count_of_products);
