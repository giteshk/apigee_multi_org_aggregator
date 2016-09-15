module.exports.set = function(app, util) {
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
                        $result.apiProduct.push(results[$i].body.apiProduct[$j]);
                    });
                }
            });
            res.json($result);
            res.status(200).end();
        });
    });

    /**
     * We will not allow API product creation/update/delete from developer portal
     */
    app.post('/o/:orgname/apiproducts', function (req, res) {
        res.status(403).end();
    });
    app.put('/o/:orgname/apiproducts/:product_name', function (req, res) {
        res.status(403).end();
    });
    app.post('/o/:orgname/apiproducts/:product_name', function (req, res) {
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
        async.parallel(util.get_aggregator_tasks(req, "/apiproducts/" + req.params.product_name), function(err,results){
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
    });
}