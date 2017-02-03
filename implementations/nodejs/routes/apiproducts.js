module.exports.routes = function(app, util, async) {
    // put more app route listings here

    //Aggregate all the API products from all the participating orgs
    app.get('/o/:orgname/apiproducts', function (req, res) {
        async.parallel(util.get_aggregator_tasks(req, "/apiproducts"), function(err,results){
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
                        $result = {apiProduct : []};
                    }
                    Object.keys(results[$i].body.apiProduct).forEach(function($j){
                        results[$i].body.apiProduct[$j].attributes.push({
                            'name': 'orgname',
                            'value': results[$i].org
                        });
                        results[$i].body.apiProduct[$j].name = util.format_product_name(results[$i].org, results[$i].body.apiProduct[$j].name);
                        $result.apiProduct.push(results[$i].body.apiProduct[$j]);
                    });
                }
            });
            res.write(JSON.stringify($result));
            res.status(200).end();
        });
    });

    /**
     * We will not allow API product creation/update/delete from developer portal
     */
    app.post('/o/:orgname/apiproducts', function (req, res) {
        res.status(403).end();
    });
    app.put('/o/:orgname/apiproducts', function (req, res) {
        res.status(403).end();
    });
    app.delete('/o/:orgname/apiproducts', function (req, res) {
        res.status(403).end();
    });
    app.post('/o/:orgname/apiproducts/:product_name', function (req, res) {
        res.status(403).end();
    });
    app.put('/o/:orgname/apiproducts/:product_name', function (req, res) {
        res.status(403).end();
    });
    app.delete('/o/:orgname/apiproducts/:product_name', function (req, res) {
        res.status(403).end();
    });

    /**
     * Get the API product information for a particular product
     * This will pick the first API product and send it to the client
     */
    app.get('/o/:orgname/apiproducts/:product_name', function (req, res) {
        apiproxy = util.apiProxy(req, req.aggregator.product_info.org);
        apiproxy.web(req, res);
    });

    app.param('product_name', function(req, res, next, product_name){
        req.aggregator.product_info = {
            org : util.parse_org_from_product_name(product_name),
            product : util.parse_product_from_str(product_name),
        };
        next();
    });
}