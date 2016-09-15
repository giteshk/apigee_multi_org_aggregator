/**
 * Developer related apis.
 */


module.exports = {
    set : function(app, util, async) {
        //Get All Developers
        app.get('/o/:orgname/developers', function(req,res){
            async.parallel(util.get_aggregator_tasks(req, '/developers'), function(err,results){
                var $response = null;
                Object.keys(results).forEach(function($i){
                    if(req.query.expand !== 'true'){
                        if($response === null){
                            $response = [];
                        }
                        Object.keys(results[$i].body).forEach(function($j){
                            if($response.indexOf(results[$i].body[$j]) === -1) {
                                $response.push(results[$i].body[$j]);
                            }
                        });
                    } else {
                        if($response === null) {
                            $response = {developer : {}};
                        }
                        $output = $response.developer;
                        $devs = results[$i].body.developer;
                        var $org_data = {};
                        Object.keys($devs).forEach(function($j){
                            if(!$output[$devs[$j].email]) {
                                $output[$devs[$j].email] = $devs[$j];
                            }
                            if(!$output[$devs[$j].email].org_data){
                                $output[$devs[$j].email].org_data = {};
                            }
                            $output[$devs[$j].email].org_data[results[$i].org] = {
                                companies: $devs[$j].companies ,
                                apps: $devs[$j].apps,
                                developerId : $devs[$j].developerId,
                                org : results[$i].org,
                            };
                            $output[$devs[$j].email].developerId = $devs[$j].email;
                            $output[$devs[$j].email].companies = [];
                            $output[$devs[$j].email].apps = [];
                        });
                    }
                });
                if($response.developer) {
                    $output = [];
                    Object.keys($response.developer).forEach(function($k){
                        $output.push($response.developer[$k]);
                    });
                    $response.developer = $output;
                }
                res.json($response);
                res.status(200).end();
            });
        });

        //Create Developer
        app.post('/o/:orgname/developers', function(req,res){
            async.parallel(util.get_aggregator_tasks(req, '/developers'), function(err,results){
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

        //Delete all Developers
        app.delete('/o/:orgname/developers', function(req,res){
            res.status(403).end();
        });

        /**
         * All Individual Developer operations
         */
        app.all('/o/:orgname/developers/:developer_id', function (req, res) {
            async.parallel(util.get_aggregator_tasks(req, '/developers/' + req.params.developer_id), function(err,results){
                $output = null;
                $org_data = {};
                $status_code = 200;
                Object.keys(results).forEach(function($i){
                    $r = results[$i];
                    if($r.status_code == 200) {
                        if($output === null) {
                            $output = $r.body;
                        }
                        $org_data[$r.org] = {
                            companies: $r.body.companies ,
                            apps: $r.body.apps,
                            developerId : $r.body.developerId,
                            org : $r.org,
                        };
                    } else {
                        $status_code = $r.status_code;
                    }
                });
                if($output === null) {
                    res.status($status_code).end();
                } else {
                    $output.org_data = $org_data;
                    $output.developerId = $output.email;
                    $output.companies = [];
                    $output.apps = [];
                    res.json($output);
                    res.status($status_code).end();
                }
            });
        });
    }
}