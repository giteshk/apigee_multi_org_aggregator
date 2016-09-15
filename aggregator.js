var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var apigee = require('apigee-access');

var async = require("async");
var all_orgs = [];

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

if(apigee.getMode() === apigee.APIGEE_MODE) {
    var orgVault = apigee.getVault('aggregator_org_info', 'organization');
    orgVault.getKeys(function(err, $orgs){
        var tasks = [];
        Object.keys($orgs).forEach(function($i){
            this.push(function(callback){
                orgVault.get($orgs[$i], function(er, val){
                    callback(null, val);
                });
            });
        }, tasks);
        async.parallel(tasks, function(err, rs){
            Object.keys(rs).forEach(function(j){
               $r = rs[j].split(",");
               all_orgs[all_orgs.length] = {
                   endpoint : $r[0],
                   org: $r[1],
                   authorization: "Basic " + new Buffer($r[2] + ":" + $r[3]).toString("base64"),
               };
            });

        });
    });
} else {
    all_orgs = [
        {
            org: 'gkli',
            endpoint : 'https://api.enterprise.apigee.com/v1',
            authorization : ''
        },
        {
            org: 'gkoli_orgadmin3',
            endpoint : 'https://api.enterprise.apigee.com/v1',
            authorization: '',
        }
    ];
}
app.use(function(req,res,next){
    if(apigee.getMode() === apigee.APIGEE_MODE) {
        if(all_orgs.length === 0) {
            res.json({error: "Org Configuration not set correctly in vault"})
            res.status(500).end();
        } else {
            next();
        }
    }else {
        Object.keys(all_orgs).forEach(function(i){
            all_orgs[i].authorization = req.headers.authorization;
        });
        next();
    }
});



function _get_aggregator_tasks(req, resource){
    var tasks = [];
    Object.keys(all_orgs).forEach(function ($index) {
        var $org = all_orgs[$index];
        this.push(function (callback){
            request({
                'method': req.method,
                'uri': $org['endpoint'] + '/o/' + $org['org'] + resource,
                'headers': {
                    'Accept': req.header('accept'),
                    'Authorization' : $org['authorization'],
                    'Content-Type' : req.header('content-type'),
                },
                'qs': req.query,
                'body' : JSON.stringify(req.body),
            }, function (err, response, body) {
                if(err) {
                    return callback(null, {error: err});
                } else {
                    try{
                        body = JSON.parse(body);
                    } catch($e){
                        //Ignore parsing errors
                    }
                    return callback(null, {org: $org['org'], body: body, status_code:  response.statusCode , response_headers : response.headers});
                }
            });

        });
    }, tasks);
    return tasks;
}
//Aggregate all the API products from all the participating orgs
app.get('/o/:orgname/apiproducts', function (req, res) {
    async.parallel(_get_aggregator_tasks(req, "/apiproducts"), function(err,results){
        $result = null;
        Object.keys(results).forEach(function($i){
            if(req.query.expand !== 'true'){
                if($result === null){
                    $result = [];
                }
                Object.keys(results[$i].body).forEach(function($j){
                    $result.push(results[$i].body[$j]);
                });
            } else {
                if($result === null) {
                    $result = {apiProduct : []};
                }
                Object.keys(results[$i].body.apiProduct).forEach(function($j){
                    results[$i].body.apiProduct[$j].attributes.push({
                        'name': 'orgname',
                        'value': results[$i].org
                    });
                    $result.apiProduct.push(results[$i].body.apiProduct[$j]);
                });
            }
        });
        res.json($result);
        res.status(200).end();
    });
});

/**
 * We will not allow API product creation/update/delete from developer portal
 */
app.post('/o/:orgname/apiproducts', function (req, res) {
    res.status(403).end();
});
app.put('/o/:orgname/apiproducts/:product_name', function (req, res) {
    res.status(403).end();
});
app.post('/o/:orgname/apiproducts/:product_name', function (req, res) {
    res.status(403).end();
});
app.delete('/o/:orgname/apiproducts/:product_name', function (req, res) {
    res.status(403).end();
});

/**
 * Get the API product information for a particular product
 * This will pick the first API product and send it to the client
 */
app.get('/o/:orgname/apiproducts/:product_name', function (req, res) {
    async.parallel(_get_aggregator_tasks(req, "/apiproducts/" + req.params.product_name), function(err,results){
        $result = null;
        Object.keys(results).forEach(function($i){
            if(results[$i].status_code == 200) {
                $result = results[$i].body;
                if(!$result.attributes){
                    $result.attributes = [];
                }
                $result.attributes.push({
                    'name': 'orgname',
                    'value': results[$i].org
                });
            }
        });
        if($result === null) {
            res.status(400).end();
        } else {
            res.json($result);
            res.status(200).end();
        }
    });
});

//Developer related apis.
/**
 * We are not going to update/insert developers to all orgs.
 * Creation of developer happens during app update / create
 */

app.get('/o/:orgname/developers', function(req,res){
    async.parallel(_get_aggregator_tasks(req, '/developers'), function(err,results){
        $result = null;
        Object.keys(results).forEach(function($i){
            if(req.query.expand !== 'true'){
                if($result === null){
                    $result = [];
                }
                Object.keys(results[$i].body).forEach(function($j){
                    if($result.indexOf(results[$i].body[$j]) === false) {
                        $result.push(results[$i].body[$j]);
                    }
                });
            } else {
                if($result === null) {
                    $result = {developer : []};
                }
                Object.keys(results[$i].body.developer).forEach(function($j){
                    results[$i].body.developer[$j].attributes.push({
                        'name': 'orgname',
                        'value': results[$i].org
                    });
                    $result.developer.push(results[$i].body.developer[$j]);
                });
            }
        });
        res.json($result);
        res.status(200).end();
    });
});

app.post('/o/:orgname/developers', function(req,res){
    async.parallel(_get_aggregator_tasks(req, '/developers'), function(err,results){
        $status_code = 201;
        $response_body = null;
        Object.keys(results).forEach(function($i){
            if(results[$i].status_code !== 201){
                $status_code = results[$i].status_code;
                $response_body = results[$i].body;
            }
        });
        if($response_body !== null){
            res.json($response_body);
        }
        res.status($status_code).end();
    });
});

app.delete('/o/:orgname/developers', function(req,res){
    res.status(403).end();
});

/**
 * All Developer operations
 */
app.all('/o/:orgname/developers/:developer_id', function (req, res) {
    async.parallel(_get_aggregator_tasks(req, '/developers/' + req.params.developer_id), function(err,results){
        $result = null;
        $org_metadata = {};
        $status_code = 200;
        Object.keys(results).forEach(function($i){
            $r = results[$i];
            if($r.status_code == 200) {
                if($result === null) {
                    $result = $r.body;
                }
                $org_metadata[$r.org] = {
                    companies: $r.body.companies ,
                    apps: $r.body.apps,
                    developerId : $r.body.developerId,
                };
            } else {
                $status_code = $r.status_code;
            }
        });
        if($result === null) {
            res.status($status_code).end();
        } else {
            $result.orgMetadata = $org_metadata;
            res.json($result);
            res.status($status_code).end();
        }
    });
});

/**
 * App related api calls
 */
function _aggregator_all_apps_get_processor(resource, req, res) {
    async.parallel(_get_aggregator_tasks(req, resource), function(err,results){
        $result = null;
        Object.keys(results).forEach(function($i){
            if(req.query.expand !== 'true'){
                if($result === null){
                    $result = [];
                }
                Object.keys(results[$i].body).forEach(function($j){
                    $result.push(results[$i].body[$j]);
                });
            } else {
                if($result === null) {
                    $result = {app : []};
                }
                Object.keys(results[$i].body.app).forEach(function($j){
                    results[$i].body.app[$j].attributes.push({
                        'name': 'orgname',
                        'value': results[$i].org
                    });
                    $result.app.push(results[$i].body.app[$j]);
                });
            }
        });
        res.json($result);
        res.status(200).end();
    });
}
function _aggregator_single_all_get_processor(resource, req, res) {
    async.parallel(_get_aggregator_tasks(req, resource), function(err,results){
        $result = null;
        Object.keys(results).forEach(function($i){
            if(results[$i].status_code == 200) {
                $result = results[$i].body;
                if(!$result.attributes){
                    $result.attributes = [];
                }
                $result.attributes.push({
                    'name': 'orgname',
                    'value': results[$i].org
                });
            }
        });
        if($result === null) {
            res.status(400).end();
        } else {
            res.json($result);
            res.status(200).end();
        }
    });
}
/**
 * API call to pull in apps from every org
 */
app.get('/o/:orgname/apps', function (req, res) {
    _aggregator_all_apps_get_processor("/apps", req, res);
});

/**
 * Get an app for developer
 */
app.get('/o/:orgname/apps/:appid', function (req, res) {
    _aggregator_single_all_get_processor('/apps/' + req.params.appid, req, res);
});

/**
 * Get all apps for developer
 */
app.get('/o/:orgname/developers/:email/apps', function (req, res) {
    _aggregator_all_apps_get_processor('/developers/' + req.params.email + '/apps', req, res);
});

/**
 * This acts like a GET and also runs before any other methods and loads the developer object
 */
app.get('/o/:orgname/developers/:email/apps/:appid',  upload.array(), function (req, res, next) {
    _aggregator_single_all_get_processor('/developers/' + req.params.email + '/apps/' + req.params.appid, req, res);
});


/**
 * Handle POST/PUT on Developer App
 */
app.all('/o/:orgname/developers/:email/apps/:appid', upload.array(), function (req, res) {
    if(req.method == 'GET') {
        return _aggregator_single_all_get_processor('/developers/' + req.params.email + '/apps/' + req.params.appid, req, res);
    }
    if(req.method == 'DELETE') {
        async.parallel(_get_aggregator_tasks(req, '/developers/' + req.params.email + '/apps/' + req.params.appid), function(err,results){
            res.status(201).end();
        });
    }
    if(req.method != 'POST' && req.method != 'PUT' && req.method != 'DELETE') {
        res.status(404).end();
        return;
    }/*
     orgname = req.params.orgname;
     console.log(req.DeveloperApp);
     for(var i in req.DeveloperApp.attributes){
     if(req.DeveloperApp.attributes[i].name == 'orgname'){
     orgname = req.DeveloperApp.attributes[i].value;
     break;
     }
     }
     var $headers = req.headers;
     delete $headers.host;
     var options =  {
     'method': req.method,
     'uri':  management_server + '/v1/o/' + orgname + '/developers/' + req.params.email + '/apps/' + req.params.appid,
     'headers': $headers,
     'qs': req.query
     };

     if(req.method != 'DELETE') { //DELETE does not need body
     options['json'] = req.body;
     }
     request(options, function (err, response, body) {
     console.log(response);
     res.send(body);
     res.status(response.statusCode).end();
     });*/
});

app.listen(9000);


