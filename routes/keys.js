var app_helper = require('./apps').app_helper;
module.exports.routes = function(app, util, async) {

    /**
     * Key operation for App
     */
    app.all('/o/:orgname/developers/:developer_id/apps/:appname/keys/:keyid/apiproducts/:apiproduct', function (req, res) {
        app_helper.app_processor_single(req, res, util);
    });
    /**
     * Generate key for app
     */
    app.all('/o/:orgname/developers/:developer_id/apps/:appname/keys/:keyid', function (req, res) {
        app_helper.app_processor_single(req, res, util);
    });

    app.get('/o/:orgname/environments/:env/stats/apps', function(req, res){
        $org = util.parse_org_from_product_name(req.query.developer_app);
        req.query.developer_app = util.parse_product_from_str(req.query.developer_app);
        $query = [];
        Object.keys(req.query).forEach(function(k){
            $query.push(k + "=" + req.query[k]);
        });
        apiproxy = util.apiProxy(req, $org);
        apiproxy.options.target += "?" + $query.join("&");
        console.log(apiproxy.options.target);
        apiproxy.web(req, res);
    });
}