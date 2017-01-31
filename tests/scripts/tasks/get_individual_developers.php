<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 2:07 PM
 */
use google\appengine\api\taskqueue\PushTask;

if(FALSE && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(500);
    exit;
}

require './execute_request.php';

$org = $_REQUEST['org'];
$developer = $_REQUEST['developer'];


$org_url_mapping = [];
$org_url_mapping[$org] = 'https://api.enterprise.apigee.com/v1/o/' . $org . '/developers/' . $developer;


$count_function = function ($response_obj) {
    return isset($response_obj->email) && ($response_obj->email == $_REQUEST['developer']) ? 1 : 0;
};
$all_responses = execute_aggregator_request($org_url_mapping, "individual_developers", $developer, '.', $count_function);

if($all_responses[$org]) {
    foreach($all_responses[$org]->apps as $app){
        $task = new PushTask('/analytics/individual_developer_apps', ['org' => $org, 'developer' => $developer, 'app' => $app], ['method' => 'POST']);
        $task->add("get-individual-developer-apps");
    }
}
http_response_code(count($all_responses)>0 ? 200 : 500);
exit;