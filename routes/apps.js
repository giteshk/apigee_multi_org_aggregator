var app_helper = {

    /**
     * App related api calls
     */
    all_apps_get_processor: function(resource, req, res, async, util) {
        async.parallel(util.get_aggregator_tasks(req, resource), function(err,results){
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
    },
    single_app_get_processor : function(resource, req, res, async, util) {
        async.parallel(util.get_aggregator_tasks(req, resource), function(err,results){
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
}
module.exports.set = function(app, util, async) {

    /**
     * API call to pull in apps from every org
     */
    app.get('/o/:orgname/apps', function (req, res) {
        app_helper.all_apps_get_processor("/apps", req, res, async, util);
    });

    /**
     * Get an app for developer
     */
    app.get('/o/:orgname/apps/:appid', function (req, res) {
        app_helper.single_app_get_processor('/apps/' + req.params.appid, req, res, async, util);
    });

    /**
     * Get all apps for developer
     */
    app.get('/o/:orgname/developers/:email/apps', function (req, res) {
        app_helper.all_apps_get_processor('/developers/' + req.params.email + '/apps', req, res, async, util);
    });

    /**
     * Handle POST/PUT on Developer App
     */
    app.all('/o/:orgname/developers/:email/apps/:appid', function (req, res) {
        if(req.method == 'GET') {
            return app_helper.single_app_get_processor('/developers/' + req.params.email + '/apps/' + req.params.appid, req, res, async, util);
        } else if(req.method == 'DELETE') {
            async.parallel(util.get_aggregator_tasks(req, '/developers/' + req.params.email + '/apps/' + req.params.appid), function(err,results){
                res.status(201).end();
            });
        } else if(req.method != 'POST' && req.method != 'PUT' && req.method != 'DELETE') {
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
}