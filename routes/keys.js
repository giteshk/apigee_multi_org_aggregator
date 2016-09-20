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
}