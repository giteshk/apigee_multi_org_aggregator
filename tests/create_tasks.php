<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 1:07 PM
 */

use google\appengine\api\taskqueue\PushTask;
use google\appengine\api\taskqueue\PushQueue;

$orgs = ['gitesh', 'gitesh1', 'gitesh2', 'gitesh3'];

//All Developers count
foreach ($orgs as $org) {
    $task = new PushTask('/analytics/all_developers', ['orgs' => [$org]], ['method' => 'POST']);
    $queue = new PushQueue("get-all-developers");
    $queue->addTasks([$task]);

//All Developers expanded
    $task = new PushTask('/analytics/all_developers_expanded', ['orgs' => [$org]], ['method' => 'POST']);
    $queue = new PushQueue("get-all-developers");
    $queue->addTasks([$task]);


//All Apps count
    $task = new PushTask('/analytics/all_apps', ['orgs' => [$org]], ['method' => 'POST']);
    $queue = new PushQueue("get-all-apps");
    $queue->addTasks([$task]);

    $task = new PushTask('/analytics/all_apps_expanded', ['orgs' => [$org]], ['method' => 'POST']);
    $queue = new PushQueue("get-all-apps");
    $queue->addTasks([$task]);
}