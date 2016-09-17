var app_helper = require('./apps').app_helper;
module.exports.routes = function(app, util, async) {

    /**
     * Key operation for App
     */
    app.all('/o/:orgname/developers/:email/apps/:appid/keys/:keyid/apiproducts/:apiproduct', function (req, res) {
        $orgs = [];
        $org = util.parse_org_from_product_name(req.params.apiproduct);
        if($org !== null){
            $orgs.push($org);
        }
        $apiproduct = util.parse_product_from_str(req.params.apiproduct);
        var resource = '/developers/' + req.params.email + '/apps/'+req.params.appid + "/keys/" + req.params.keyid + "/apiproducts/" + $apiproduct;
        if(req.method == 'POST' || req.method == 'PUT') {
            res.status(403).end();
        } else if (req.method == 'GET' || req.method == 'DELETE') {
            Object.keys($orgs).forEach(function($i){
                async.parallel([util.get_aggregator_task(req, resource, $orgs[$i])], function(err,results){
                    res.json(results[0].body);
                    res.status(results[0].status_code).end();
                });
            });
        }
    });
    /**
     * Generate key for app
     */
    app.all('/o/:orgname/developers/:email/apps/:appid/keys/:keyid', function (req, res) {
        var resource = '/developers/' + req.params.email + '/apps/'+req.params.appid + "/keys/" + req.params.keyid;
        if(req.method == 'POST' || req.method == 'PUT') {
            $orgs = app_helper.find_orgs_from_app(req.body, util);
            req.body = app_helper.remove_org_info_from_app(req.body, util);
            if($orgs.length === 1){
                async.parallel([util.get_aggregator_task(req, resource, $orgs[0])], function(err,results){
                    res.json(results[0].body);
                    res.status(results[0].status_code).end();
                });
            } else {
                res.json({"error" : "Cannot figure out which edge org to generate app in.", "org" : $orgs})
                res.status(500).end();
            }
            //app_helper.single_app_post_processor(resource, req, res, async, util);
        } else if (req.method == 'GET') {
            //app_helper.all_apps_get_processor(resource, req, res, async, util);
            res.status(403).end();
        } else if (req.method == 'DELETE') {
            res.status(403).end();
        }
    });

}