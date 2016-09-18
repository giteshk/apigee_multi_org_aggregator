var _ = require('underscore')._;

var app_helper = module.exports.app_helper = {
    developer_app_transform_fn : function(data, req, res){
        return data;
    }

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
                        $result.app.push(app_helper.add_org_info_to_app(results[$i].body.app[$j], results[$i].org, util));
                    });
                }
            });
            if($result == null) {
                $result = [];
                if(req.query.expand === 'true'){
                    $result = {app : []};
                }
            }
            res.json($result);
            res.status(200).end();
        });
    },
    single_app_get_processor : function(resource, req, res, async, util) {
        async.parallel(util.get_aggregator_tasks(req, resource), function(err,results){
            $result = null;
            Object.keys(results).forEach(function($i){
                if(results[$i].status_code == 200) {
                    $result = results[$i].body;
                    result = app_helper.add_org_info_to_app($result, results[$i].org, util);
                }
            });
            if($result === null) {
                res.status(404).end();
            } else {
                res.json($result);
                res.status(200).end();
            }
        });
    },
    single_app_post_processor : function(resource, req, res, async, util) {
        $orgs = app_helper.find_orgs_from_app(req.body, util);
        if($orgs.length !== 1){
            res.json({"error" : "Cannot figure out which edge org to generate app in.", "org" : $orgs})
            res.status(500).end();
        } else {
            req.body = app_helper.remove_org_info_from_app(req.body, util);
            Object.keys($orgs).forEach(function($i){
                async.parallel([util.get_aggregator_task(req, resource, $orgs[$i])], function(err,results){
                    res.json(results[0].body);
                    res.status(results[0].status_code).end();
                });
            });
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
        app.attributes.push({
            'name': 'orgname',
            'value': org
        });

        return app;
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
        return app;
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
    $app_paths = ['/o/:orgname/developers/:email/apps','/o/:orgname/developers/:email/apps/:appid' ];
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
                    async.parallel([util.get_aggregator_task(req, "/developers/" + req.params.email, $from_org )],
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
    app.all('/o/:orgname/developers/:email/apps', function (req, res) {
        var resource = '/developers/' + req.params.email + '/apps';
        if(req.method == 'POST' || req.method == 'PUT') {
            app_helper.single_app_post_processor(resource, req, res, async, util);
        } else if (req.method == 'GET') {
            app_helper.all_apps_get_processor(resource, req, res, async, util);
        } else if (req.method == 'DELETE') {
            res.status(403).end();
        }
    });

    /**
     * Handle POST/PUT on Developer App
     */
    app.all('/o/:orgname/developers/:email/apps/:appid', function (req, res) {
        var resource = '/developers/' + req.params.email + '/apps/' + req.params.appid;
        if(req.method == 'GET') {
            return app_helper.single_app_get_processor(resource, req, res, async, util);
        } else if(req.method == 'DELETE') {
            async.parallel(util.get_aggregator_tasks(req, resource), function(err,results){
                res.status(201).end();
            });
        } else if(req.method == 'POST' || req.method == 'PUT') {
            return app_helper.single_app_post_processor(resource, req, res, async, util);
        }
    });

}