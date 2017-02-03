<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 2:07 PM
 */
use google\appengine\api\taskqueue\PushTask;
use google\appengine\api\taskqueue\PushQueue;

if(FALSE && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(500);
    exit;
}

require './execute_request.php';

$org = $_REQUEST['org'];
$developer = $_REQUEST['developer'];

$org_url_mapping = [];
$org_url_mapping[$org] = '/o/' . $org . '/developers/' . $developer . '/apps';


$count_function = function ($response_obj) {
    return count($response_obj);
};
$all_responses = execute_aggregator_request($org_url_mapping, $developer, '*', $count_function);

$tasks = [];
foreach($all_responses as $org => $response) {
    foreach($response as $app) {
        $tasks[] = new PushTask('/analytics/developers/developer/apps/app', ['org' => $org, 'developer' => $developer, 'app' => $app], ['method' => 'POST']);
    }
}
if(!empty($tasks)) {
    $queue = new PushQueue("get-individual-developer-app");
    foreach(array_chunk($tasks, 100) as $task_chunk) {
        $queue->addTasks($task_chunk);
    }
}
http_response_code(count($all_responses)>0 ? 200 : 500);
exit;