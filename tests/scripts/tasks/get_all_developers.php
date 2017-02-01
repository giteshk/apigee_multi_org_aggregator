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

$org_url_mapping = [];
foreach ($_REQUEST['orgs'] as $org) {
    $org_url_mapping[$org] = '/o/' . $org . '/developers';
}

$count_function = function ($response_obj) {
    return count($response_obj);
};
$all_responses = execute_aggregator_request($org_url_mapping, '*', '', $count_function);

$tasks = [];
foreach($all_responses as $org => $developers){
    foreach($developers as $developer) {
        $tasks[] = new PushTask('/analytics/developers/developer', ['org' => $org, 'developer' => $developer], ['method' => 'POST']);
    }
}
if(!empty($tasks)) {
    $queue = new PushQueue("get-individual-developers");
    foreach(array_chunk($tasks, 100) as $task_chunk) {
        $queue->addTasks($task_chunk);
    }
}
http_response_code(count($all_responses)>0 ? 200 : 500);
exit;