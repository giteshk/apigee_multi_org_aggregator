/**
 * Developer related apis.
 */
var request = require('request');
var validator = require('validator');
var transformerProxy =  require('transformer-proxy');

var self = module.exports = {
    _developer_transform : function(developer){
        developer.developerId = developer.email;
        developer.companies = [];
        developer.apps = [];
        return developer;
    },
    developers_transform_fn : function(data, req, res){
        developers = JSON.parse(data.toString());
            if(developers.developer){
            for(var i=0; i< developers.developer.length; i++){
                developers.developer[i] = self._developer_transform(developers.developer[i]);
            }
        } else {
            developers = self._developer_transform(developers);
        }
        return JSON.stringify(developers);
    },
    routes : function(app, util, async) {
        app.use('/o/:orgname/developers', transformerProxy(self.developers_transform_fn));
        //All Developers operation.
        app.all('/o/:orgname/developers', function(req,res){
            if(req.method == 'DELETE') {
                res.status(403).end();
            } else {
                var proxy = util.apiProxy(req);
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
                var proxy = util.apiProxy(req);
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