<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 2:07 PM
 */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(500);
    exit;
}
require './execute_request.php';

$org_url_mapping = [];
foreach ($_REQUEST['orgs'] as $org) {
    $org_url_mapping[$org] = '/o/' . $org . '/apps';
}

$count_function = function ($response_obj) {
    return count($response_obj);
};
$all_responses = execute_aggregator_request($org_url_mapping, '', '*', $count_function);

$tasks = [];
foreach($all_responses as $org => $app){
  foreach($developers as $developer) {
    $tasks[] = new PushTask('/analytics/apps/app', ['org' => $org, 'app' => $app], ['method' => 'POST']);
  }
}
if(!empty($tasks)) {
  $queue = new PushQueue("get-individual-app");
  foreach(array_chunk($tasks, 100) as $task_chunk) {
    $queue->addTasks($task_chunk);
  }
}

http_response_code(count($all_responses)>0 ? 200 : 500);
exit;
