<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 2:07 PM
 */

if (FALSE && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(500);
    exit;
}
require './execute_request.php';

$org_url_mapping = [];
foreach ($_REQUEST['orgs'] as $org) {
    $org_url_mapping[$org] = '/o/' . $org . '/apps?expand=true';
}

$count_function = function ($response_obj) {
    return isset($response_obj->app) ? count($response_obj->app) : 0;
};
$all_responses = execute_aggregator_request($org_url_mapping, '', '*', $count_function);

http_response_code(count($all_responses)>0 ? 200 : 500);
exit;
