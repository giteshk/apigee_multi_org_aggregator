<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 2:07 PM
 */
if(FALSE && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(500);
    exit;
}

require './execute_request.php';

$org = $_REQUEST['org'];
$developer = $_REQUEST['developer'];
$app = $_REQUEST['app'];

$org_url_mapping = [];
$org_url_mapping[$org] = 'https://api.enterprise.apigee.com/v1/o/' . $org . '/developers/' . $developer . '/apps/' . $app;


$count_function = function ($response_obj) {
    return isset($response_obj->appId) ? 1 : 0;
};
$all_responses = execute_aggregator_request($org_url_mapping, "individual_developer_apps", $developer, $app, $count_function);
http_response_code(count($all_responses)>0 ? 200 : 500);
exit;