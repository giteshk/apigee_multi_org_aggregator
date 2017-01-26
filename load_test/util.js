var exports = module.exports = {};
var request = require('request');

exports.cleanupTestDevelopers = function(mgmt_endpoint, $auth){
    //Cleanup previous version of test-products
    request({
        url : mgmt_endpoint + "/developers",
        auth: $auth
    }, function(error, response, body){
        JSON.parse(body).forEach(function($i) {
            if($i.indexOf("aggregator-test") === 0) {
                request({
                    url : mgmt_endpoint + "/developers/" + $i,
                    auth : $auth,
                    method : 'delete'
                });
            }
        });
    });
}

exports.createTestDevelopers = function(mgmt_endpoint, $auth, $limit){

    for(var $c=1 ; $c <= $limit; $c++){
        console.log("started " + $c);
        $apiproduct = {
            "email" : "aggregator-test-" + $c + "@testing.apigee.com",
            "firstName" : "Aggregator ",
            "lastName" : "Test User " + $c,
            "userName" : "aggregator_test_" + $c,
        };
        request({
            url : mgmt_endpoint + "/developers",
            auth : $auth,
            body : $apiproduct,
            json: true,
            method : 'POST'
        }, function(error, response, body){
            if(error) {
                console.log("Error creating developers");
            }
        });
    }
}
exports.cleanupAPIProducts = function(mgmt_endpoint, $auth){
//Cleanup previous version of test-products
    request({
        url : mgmt_endpoint + "/apiproducts",
        auth: $auth
    }, function(error, response, body){
        JSON.parse(body).forEach(function($i) {
            if($i.indexOf("aggregator-test") === 0) {
                request({
                    url : mgmt_endpoint + "/apiproducts/" + $i,
                    auth : $auth,
                    method : 'delete'
                });
            }
        });
    });

}


exports.createTestAPIProducts = function(mgmt_endpoint, $auth, $orgname, $limit) {

    for(var $c=1 ; $c <= $limit; $c++){
        console.log("started " + $c);
        $apiproduct = {
            "name" : "aggregator-test-product-" + $c + "-" + $orgname,
            "displayName": "Aggregator test Product " + $c,
            "approvalType": "auto",
            "attributes": [],
            "description": "Testing api product " + $c,
            "apiResources": [],
            "environments": [],
            "proxies": [],
            "scopes": []
        };
        request({
            url : mgmt_endpoint + "/apiproducts",
            auth : $auth,
            body : $apiproduct,
            json: true,
            method : 'POST'
        }, function(error, response, body){
             if(error) {
                console.log("Error creating product");
            }
        });
    }
    return $limit;

}

exports.cleanupApps = function(mgmt_endpoint, $auth){
    request({
        url: mgmt_endpoint + "/developers",
        auth: $auth
    }, function (error, response, body) {
        JSON.parse(body).forEach(function ($i) {

            if ($i.indexOf("aggregator-test") === 0) {

                request({
                    url: mgmt_endpoint + "/developers/" + $i + "/apps",
                    auth: $auth
                }, function (err, res, b) {
                    console.log('Deleting apps for ' + $i);
                    JSON.parse(b).forEach(function ($j)
                    {
                        request({
                            url: mgmt_endpoint + "/developers/" + $i + "/apps/" + $j,
                            auth: $auth,
                            method: "DELETE"
                        },function(e,r,b1){
                            if(e) {
                                console.log(e);
                            }
                        });
                    });
                });
            }
        });
    });
}

exports.createTestApps = function(mgmt_endpoint, $auth, $orgname, $apiproducts_count) {
    //Create apps for each Developer
    request({
        url: mgmt_endpoint + "/developers",
        auth: $auth
    }, function (error, response, body) {
        JSON.parse(body).forEach(function ($i) {
            if ($i.indexOf("aggregator-test") === 0) {
                console.log($i);
                var $appcount = Math.floor((Math.random() * 10));
                for (var $c = 1; $c <= $appcount; $c++) {
                    $app = {
                        "name": "aggregator-test-app-" + $c + $orgname + "--" + Math.floor(Math.random()*10000),
                        "apiProducts": [],
                    };
                    $no_of_apiproducts = Math.floor(Math.random() * $apiproducts_count + 1);

                    for ($d = 1; $d <= $no_of_apiproducts; $d++) {
                        $_product_id = 'aggregator-test-product-' + (Math.floor(Math.random() * $apiproducts_count)+ 1) + "-" + $orgname;
                        $app.apiProducts[$_product_id] = $_product_id;
                    }
                    $app.apiProducts = Object.keys($app.apiProducts);
                    console.log($app.apiProducts);
                    request({
                        url: mgmt_endpoint + "/developers/" + $i + "/apps",
                        auth: $auth,
                        method: 'POST',
                        "body": $app,
                        json: true,
                    }, function (err, res, b) {
                        if (err) {
                            console.log("Error creating Apps");
                        }
                    });
                }
            }
        });
    });
}