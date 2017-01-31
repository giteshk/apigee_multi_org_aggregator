<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 1:07 PM
 */

use google\appengine\api\taskqueue\PushTask;
use google\appengine\api\taskqueue\PushQueue;

require "./scripts/tasks/execute_request.php";

$orgs = get_all_aggregated_orgs();

//All Developers count

    $task = new PushTask('/analytics/all_developers', ['orgs' => $orgs], ['method' => 'POST']);
    $queue = new PushQueue("get-all-developers");
    $queue->addTasks([$task]);

//All Developers expanded
    $task = new PushTask('/analytics/all_developers_expanded', ['orgs' => $orgs], ['method' => 'POST']);
    $queue = new PushQueue("get-all-developers");
    $queue->addTasks([$task]);


//All Apps count
    $task = new PushTask('/analytics/all_apps', ['orgs' => $orgs], ['method' => 'POST']);
    $queue = new PushQueue("get-all-apps");
    $queue->addTasks([$task]);

    $task = new PushTask('/analytics/all_apps_expanded', ['orgs' => $orgs], ['method' => 'POST']);
    $queue = new PushQueue("get-all-apps");
    $queue->addTasks([$task]);
