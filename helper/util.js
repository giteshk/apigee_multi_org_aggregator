var apigee = require('apigee-access');
var async = require("async");
var bodyParser = require('body-parser');
var request = require('request');
var httpProxy = require('http-proxy');
var _ = require('underscore')._;
var transformerProxy =  require('transformer-proxy');


var all_orgs = [];
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
                all_orgs[$r[1]] = {
                    endpoint : $r[0],
                    org: $r[1],
                    authorization: "Basic " + new Buffer($r[2] + ":" + $r[3]).toString("base64"),
                    auth : $r[2] + ":" + $r[3],
                };
            });

        });
    });
} else {
    all_orgs = {
        'gkli' :
        {
            org: 'gkli',
            endpoint : 'https://gkli-prod.apigee.net/mgmt-proxy-test',
            authorization : '',
            auth: '',
        },
        'gkoli_orgadmin3':
        {
            org: 'gkoli_orgadmin3',
            endpoint : 'https://api.enterprise.apigee.com/v1',
            authorization: '',
            auth: '',
        }
    };
}

var self = module.exports = {
    cache : function() {
        return apigee.getCache("aggregator");
    },
    apiProxy : function(req, org){
        if(!org){
            org = req.aggregator.orgname;
        }
        var path = decodeURI(req.url).split("/").splice(3);
        path = _.map(path, function(val){
            return self.parse_product_from_str(val);
        });

        if(path.length > 0) {
            path = "/" + path.join("/");
        }
        console.log(all_orgs[org]['endpoint'] + '/o/' + all_orgs[org]['org'] +  path);
        var server =  httpProxy.createProxyServer({
            changeOrigin: true,
            target: all_orgs[org]['endpoint'] + '/o/' + all_orgs[org]['org'] +  path,
            auth : all_orgs[org]['auth'],
            ignorePath : true,
            onError : function(err){
                console.log(err);
                throw new Exception(err);
            }
            });
        server.on("proxyReq" , function (proxyReq, req, res, options){
            if(req.body) {
                var bodyData = JSON.stringify(req.body);
                // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json
                proxyReq.setHeader('Content-Type','application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                // stream the content
                proxyReq.write(bodyData);
            }
        });
        return server;
    },
    transform_proxy_output : function(data, req, res){
        var is_json = false;
        try{
            data = JSON.parse(data.toString());
            is_json = true;
            res.setHeader('Content-Type', 'application/json');
        } catch($e){

        }
        if(data.developer && data.apps){
            data = require("../routes/developers.js").developers_transform_fn(data);
        } else if(data.appId && req.aggregator.app_info) {
            app_helper = require("../routes/apps.js").app_helper;
            app_helper.replace_developerId(data, req);
            app_helper.add_org_info_to_app(data, req.aggregator.app_info.org, self);
        } else {
            console.log("no transform applied");
        }
        return is_json ? JSON.stringify(data) : data;
    },
    initialize : function(app){
        app.use(bodyParser.json()); // for parsing application/json
//        app.use(bodyParser.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded
//        app.use("/o/:orgname/developers/:developer_id", transformerProxy(self.transform_proxy_output));
//        app.use("/o/:orgname/apps/:appid", transformerProxy(self.transform_proxy_output));
//        app.use("/o/:orgname/apps", transformerProxy(self.transform_proxy_output));
//        app.use("/o/:orgname/developers/:developer_id/apps", transformerProxy(self.transform_proxy_output));
//        app.use("/o/:orgname/developers/:developer_id/apps/:appname", transformerProxy(self.transform_proxy_output));
        app.use(transformerProxy(self.transform_proxy_output));

        app.use(function(req,res,next){
            console.log(">>>>>>>>>>>" + req.method + " " + req.url);
            $default_org = req.originalUrl.split("/")[2];
            if(!all_orgs[$default_org]) {
                res.status(401).end();
                return;
            }
            request(
                {
                    'uri' : all_orgs[$default_org]['endpoint'] + "/o/" + $default_org,
                    'headers': {
                        'Authorization' : req.headers.authorization,
                    }
            }, function(_err, _response, _body){
                    if(_response.statusCode !== 200){
                        try{
                            _body = JSON.parse(_body);
                            res.json(_body);
                        } catch($e){
                            //Ignore parsing errors
                        }
                        res.status(_response.statusCode).end();
                    } else {
                        if(apigee.getMode() !== apigee.APIGEE_MODE) {
                            Object.keys(all_orgs).forEach(function(i){
                                all_orgs[i].authorization = req.headers.authorization;
                                all_orgs[i].auth = (new Buffer(req.headers.authorization.substr("Basic ".length), 'base64')).toString();

                            });
                        }
                        if(all_orgs.length === 0) {
                            res.json({error: "Org Configuration not set correctly in vault"})
                            res.status(500).end();
                        } else {
                            next();
                        }
                    }
                });
        });

        app.param('orgname', function(req, res, next, org){
            req.aggregator = {};
            req.aggregator.orgname = org;
            next();
        });
        app.param('developer_id', function(req, res, next, developer_id){
            var org = req.aggregator.orgname;
            var cache_key = "developer_id:"+ developer_id;
            var dev_cache = self.cache();
            dev_cache.get(cache_key, function(err, cache_value){
                if(!cache_value){
                    var original_method = req.method;
                    req.method = 'GET';
                    async.parallel(self.get_aggregator_tasks(req, '/developers/' + req.params.developer_id), function(err,results){
                        for(var i=0; i< results.length; i++) {
                            if(results[i].status_code == 200) {
                                req.method = original_method;
                                results[i].body.developerId = req.aggregator.email;
                                results[i].body.apps = [];
                                results[i].body.companies = [];
                                req.aggregator.developer = results[i].body;
                                req.aggregator.orgname = results[i].org;
                                dev_cache.put(cache_key, req.aggregator.developer, 120);
                                return next();
                            }
                        }
                    });
                } else {
                    try {
                        req.aggregator.developer = JSON.parse(cache_value);
                    } catch($e){
                        //Ignore parsing errors
                    }
                    next();
                }
            });
        });
        /*
         * Catch all function for when doing local development
         *
         * This will run the calls against the first org in the settings
         */
        app.all('/o/:orgname', function(req,res){
            if(req.method == "GET") {
                self.apiProxy(req).web(req, res);
            }else {
                res.status(403).end();
            }
        });
        //Redirect /organizations/* to /o/*
        app.all('/organizations/*',function(req, res){
            req.url = "/o/" + req.url.substring("/organizations/".length);
            app.handle(req, res);
        });

    },

    catch_all_route : function(app) {
        app.all('/o/:orgname/*', function(req,res){
            self.apiProxy(req).web(req, res);
        });
    },
    get_aggregator_task : function(req, resource, org_name){
        var $org = all_orgs[org_name];
        var $task = function (callback){
            setTimeout( function(){
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
            }, 50);
        }
        return $task;
    },
    get_aggregator_tasks : function(req, resource, except) {
        if (!except){
            except = [];
        }
        var tasks = [];
        Object.keys(all_orgs).forEach(function ($index) {
            if (_.indexOf(except, $index) === -1) {
                this.push(self.get_aggregator_task(req, resource, $index));
            }
        }, tasks);
        return tasks;
    },
    format_product_name : function(org, product_name) {
        return "{{" + org + "}}"+product_name;
    },
    parse_product_from_str: function($str){
        return $str.indexOf("}}") !== -1 ? $str.substring($str.indexOf("}}") + 2) : $str;
    },
    parse_org_from_product_name : function($product){
        return $product.indexOf("}}") === -1 ? null : $product.substr(2, $product.indexOf("}}") - 2);
    }
}