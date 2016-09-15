var apigee = require('apigee-access');
var async = require("async");
var request = require('request');



module.exports = function(){
    this.all_orgs = [];

    if(apigee.getMode() === apigee.APIGEE_MODE) {
    var orgVault = apigee.getVault('aggregator_org_info', 'organization');
    orgVault.getKeys(function(err, $orgs){
        var tasks = [];
        Object.keys($orgs).forEach(function($i){
            this.push(function(callback){
                orgVault.get($orgs[$i], function(er, val){
                    callback(null, val);
                });
            });
        }, tasks);
        async.parallel(tasks, function(err, rs){
            Object.keys(rs).forEach(function(j){
                $r = rs[j].split(",");
                this.all_orgs[this.all_orgs.length] = {
                    endpoint : $r[0],
                    org: $r[1],
                    authorization: "Basic " + new Buffer($r[2] + ":" + $r[3]).toString("base64"),
                };
            });

        });
    });
    } else {
        this.all_orgs = [
            {
                org: 'gkli',
                endpoint : 'https://api.enterprise.apigee.com/v1',
                authorization : ''
            },
            {
                org: 'gkoli_orgadmin3',
                endpoint : 'https://api.enterprise.apigee.com/v1',
                authorization: '',
            }
        ];
    }
    this.initialize = function(app){
        app.use(bodyParser.json()); // for parsing application/json
        app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

        app.use(function(req,res,next){
            if(apigee.getMode() === apigee.APIGEE_MODE) {
                if(this.all_orgs.length === 0) {
                    res.json({error: "Org Configuration not set correctly in vault"})
                    res.status(500).end();
                } else {
                    next();
                }
            }else {
                Object.keys(this.all_orgs).forEach(function(i){
                    this.all_orgs[i].authorization = req.headers.authorization;
                });
                next();
            }
        });
    }
    this.get_aggregator_tasks = function(req, resource) {
        var tasks = [];
        Object.keys(this.all_orgs).forEach(function ($index) {
            var $org = this.all_orgs[$index];
            this.push(function (callback){
                request({
                    'method': req.method,
                    'uri': $org['endpoint'] + '/o/' + $org['org'] + resource,
                    'headers': {
                        'Accept': req.header('accept'),
                        'Authorization' : $org['authorization'],
                        'Content-Type' : req.header('content-type'),
                    },
                    'qs': req.query,
                    'body' : JSON.stringify(req.body),
                }, function (err, response, body) {
                    if(err) {
                        return callback(null, {error: err});
                    } else {
                        try{
                            body = JSON.parse(body);
                        } catch($e){
                            //Ignore parsing errors
                        }
                        return callback(null, {org: $org['org'], body: body, status_code:  response.statusCode , response_headers : response.headers});
                    }
                });

            });
        }, tasks);
        return tasks;
    }
}