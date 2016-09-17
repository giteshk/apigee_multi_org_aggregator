/**
 * Developer related apis.
 */
var request = require('request');
var validator = require('validator');

var self = module.exports = {
    routes : function(app, util, async) {
        //All Developers operation.
        app.all('/o/:orgname/developers', function(req,res){
            var proxy = util.apiProxy[req.params.orgname];
            if(req.method == 'DELETE') {
                res.status(403).end();
            } else {
                //Pass everything on to the backend
                proxy.web(req, res);
            }
        });

        app.use('/o/:orgname/developers/:developer_id', function(req,res, next){
            if(!validator.isEmail(req.params.developer_id)) {
                var original_method = req.method;
                req.method = "GET";
                async.parallel(util.get_aggregator_tasks(req, '/developers/' + req.params.developer_id), function(err,results){
                    for(var i=0; i< results.length; i++) {
                            if(results[i].status_code == 200) {
                                req.method = original_method;
                                developer = results[i].body;
                                req.url = "/o/" + results[i].org + "/developers/" + developer.email;
                                return app.handle(req, res);
                            }
                    }
                });
            } else {
                next();
            }
        });
        app.all('/o/:orgname/developers/:developer_id', function(req,res){
            console.log("all " + req.url);
            var proxy = util.apiProxy[req.params.orgname];
            if(req.method == 'DELETE') {
                async.parallel(util.get_aggregator_tasks(req, '/developers/' + req.params.developer_id), function(err,results){
                    for(var i=0; i< results.length; i++) {
                        if(results[i].status_code !== 404) {
                            res.json(results[0].body);
                            res.status(results[0].status_code).end();
                            return;
                        }
                    }
                });
            } if (req.method == 'GET') {
                //Send all GET requests to the backend directly. It's assumed that the first org has all the developers
                proxy.web(req, res);
            } else {
                delete req.body.developerId;
                $tasks = util.get_aggregator_tasks(req, '/developers/' + req.params.developer_id);
                async.parallel($tasks, function(err,results){
                    $result = null;
                    for(var i=0; i < results.length; i++) {
                        if(results[i].status_code == 200 || results[i].status_code == 201 ) {
                            $result = results[i];
                        }
                    }
                    if($result !== null){
                        $result.body.developerId = $result.body.email;
                        res.json($result.body);
                        res.status($result.status_code).end();
                    }
                });
            }
        });
    }
}