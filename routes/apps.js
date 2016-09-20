var _ = require('underscore')._;

var app_helper = module.exports.app_helper = {

    /**
     * App related api calls
     */
    all_apps_get_processor: function(resource, req, res, async, util) {
        async.parallel(util.get_aggregator_tasks(req, resource), function(err,results){
            $result = null;
            Object.keys(results).forEach(function($i){
                if(results[$i].status_code !== 200){
                    return;
                }
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
                        app_helper.replace_developerId(results[$i].body.app[$j], req);
                        app_helper.add_org_info_to_app(results[$i].body.app[$j], results[$i].org, util)
                        $result.app.push(results[$i].body.app[$j]);
                    });
                }
            });
            if($result == null) {
                $result = [];
                if(req.query.expand === 'true'){
                    $result = {app : []};
                }
            }
            res.write(JSON.stringify($result));
            res.status(200).end();
        });
    },
    single_app_get_processor : function(resource, req, res, async, util) {
        async.parallel(util.get_aggregator_tasks(req, resource), function(err,results){
            $result = null;
            Object.keys(results).forEach(function($i){
                if(results[$i].status_code == 200) {
                    if(!req.aggregator.app_info){
                        req.aggregator.app_info = {}
                    }
                    req.aggregator.app_info = {};
                    req.aggregator.app_info.org = results[$i].org;
                    $result = results[$i].body;
                    req.aggregator.app_info.app = $result.name;
                }
            });
            if($result === null) {
                res.status(404).end();
            } else {
                res.write(JSON.stringify($result));
                res.status(200).end();
            }
        });
    },
    app_processor_single : function(req, res, util) {
        if((req.method == 'GET' || req.method == 'DELETE') && req.aggregator.app_info) {
            $orgs = [req.aggregator.app_info.org];
        }else {
            $orgs = app_helper.find_orgs_from_app(req.body, util);
        }
        if($orgs.length !== 1){
            res.write(JSON.stringify({"error" : "Cannot figure out which edge org to generate app in.", "org" : $orgs}));
            res.status(500).end();
        } else {
            apiproxy = util.apiProxy(req, $orgs[0]);
            if(req.body) {
                app_helper.remove_org_info_from_app(req.body, util);
            }
            apiproxy.web(req, res);
        }
    },
    replace_developerId : function(app, req){
        if(req.aggregator.developer && req.aggregator.developer.email) {
            app.developerId = req.aggregator.developer.email;
        }
    },
    add_org_info_to_app: function(app, org, util){
        if (app.apiProducts){
            Object.keys(app.apiProducts).forEach(function($i){
                app.apiProducts[$i] = util.format_product_name(org, app.apiProducts[$i]);
            });
        }
        if (app.credentials) {
            Object.keys(app.credentials).forEach(function($i){
                Object.keys(app.credentials[$i].apiProducts).forEach(function($j){
                    app.credentials[$i].apiProducts[$j].apiproduct = util.format_product_name(org, app.credentials[$i].apiProducts[$j].apiproduct);
                });
            });
        }
        if(!app.attributes){
            app.attributes = [];
        }
        var org_attribute_found = false;
        for(var i=0; i<app.attributes.length; i++){
            if(app.attributes[i].name == 'orgname') {
                org_attribute_found = true;
                break;
            }
        }
        if(!org_attribute_found) {
            app.attributes.push({
                'name': 'orgname',
                'value': org
            });
        }
        if(app.name) {
            app.name = util.format_product_name(org, app.name);
        }
    },
    remove_org_info_from_app: function(app, util){
        if (app.apiProducts){
            Object.keys(app.apiProducts).forEach(function($i){
                app.apiProducts[$i] = util.parse_product_from_str(app.apiProducts[$i]);
            });
        }
        if (app.credentials) {
            Object.keys(app.credentials).forEach(function($i){
                Object.keys(app.credentials[$i].apiProducts).forEach(function($j){
                    app.credentials[$i].apiProducts[$j].apiproduct = util.parse_product_from_str(app.credentials[$i].apiProducts[$j].apiproduct);
                });
            });
        }
        if(app.name) {
            app.name = util.parse_product_from_str(app.name);
        }
    },
    find_orgs_from_app: function(app, util){
        $orgs = [];
        if(app.attributes) {
            _.map(app.attributes, function(val, key){
                if(val.name == 'orgname'){
                    $orgs.push(val.value);
                }
            });
        }
        if (app.apiProducts){
            Object.keys(app.apiProducts).forEach(function($i){
                $orgs.push(util.parse_org_from_product_name(app.apiProducts[$i]));
            });
        }
        if (app.credentials) {
            Object.keys(app.credentials).forEach(function($i){
                Object.keys(app.credentials[$i].apiProducts).forEach(function($j){
                    $orgs.push(util.parse_org_from_product_name(app.credentials[$i].apiProducts[$j].apiproduct));
                });
            });
        }
        return _.unique($orgs);
    }
}
module.exports.routes = function(app, util, async) {

    /**
     * API call to pull in apps from every org
     */
    app.all('/o/:orgname/apps', function (req, res) {
        if(req.method == 'GET') {
            app_helper.all_apps_get_processor("/apps", req, res, async, util);
        } else {
            res.status(403).end();
        }
    });

    /**
     * Get an app for developer
     */
    app.all('/o/:orgname/apps/:appid', function (req, res) {
        if(req.method == 'GET') {
            app_helper.single_app_get_processor('/apps/' + req.params.appid, req, res, async, util);
        } else {
            req.status(403).end();
        }
    });
    //Paths to sync developers before app operations
    $app_paths = ['/o/:orgname/developers/:developer_id/apps','/o/:orgname/developers/:developer_id/apps/:appname' ];
    for(var i=0; i<$app_paths.length; i++){
        app.use($app_paths[i], function(req, res, next){
            if(req.method == 'POST' || req.method == 'PUT'){

                $orgs = app_helper.find_orgs_from_app(req.body, util);
                if($orgs.length==1){
                    req._original_app_body = req.body;
                    req._original_app_method = req.method;
                    req.method = 'GET';
                    $to_org = $orgs[0];
                    $from_org = req.params.orgname;
                    async.parallel([util.get_aggregator_task(req, "/developers/" + req.params.developer_id, $from_org )],
                    function(__err, __results){
                        if(__results[0].status_code == 200){
                            req.body = __results[0].body;
                            req.body.developerId = req.body.email;
                            req.method = 'POST';
                            $tasks = [];
                            $tasks.push(util.get_aggregator_task(req, "/developers", $to_org));
                            $tasks.push(util.get_aggregator_task(req, "/developers/" + req.body.email, $to_org));
                            async.parallel($tasks, function(_error, _results){
                                //Fire and forget
                                req.body = req._original_app_body;
                                req.method = req._original_app_method;
                                return next();
                            });
                        } else {
                            next();
                        }

                    });
                } else {
                    next();
                }
            } else {
                next();
            }
        });
    }
    /**
     * Get all apps for developer
     */
    app.all('/o/:orgname/developers/:developer_id/apps', function (req, res) {
        var resource = '/developers/' + req.params.developer_id + '/apps';
        if(req.method == 'POST' || req.method == 'PUT') {
            app_helper.app_processor_single(req, res, util);
        } else if (req.method == 'GET') {
            app_helper.all_apps_get_processor(resource, req, res, async, util);
        } else if (req.method == 'DELETE') {
            res.status(403).end();
        }
    });

    /**
     * Handle POST/PUT on Developer App
     */
    app.all('/o/:orgname/developers/:developer_id/apps/:appname', function (req, res) {
        app_helper.app_processor_single(req, res, util);
    });

    app.param("appname", function (req, res, next, appname){
        req.aggregator.app_info = {
            org : util.parse_org_from_product_name(appname),
            app : util.parse_product_from_str(appname),
        }
        next();
    })

}