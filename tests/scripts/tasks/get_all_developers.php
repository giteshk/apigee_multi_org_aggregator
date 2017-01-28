<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 2:07 PM
 */

if($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(500);
    exit;
}
$developer_stats = [];
foreach($_REQUEST['orgs'] as $org) {
    $time = time();
    $curl = curl_init( 'https://api.enterprise.apigee.com/v1/o/' . $org . '/developers');
    curl_setopt_array($curl, array(
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_USERPWD => 'gitesh@gkoli.info:p0o9i8U7',
    ));
    $result = curl_exec($curl);
    $developers = json_decode($result);
    $request_info = curl_getinfo($curl);
    $developer_stats[$org] = ['count' => count($developers), 'total_time' => $request_info['total_time'], 'timestamp' => $time];
}

$conn = new pdo('mysql:unix_socket=/cloudsql/apigee-aggregator:us-central1:aggregator;dbname=analytics_db', 'root', '');

foreach($developer_stats as $org => $info) {
    $query = "INSERT INTO analytics values('{$org}', 'all_developers', {$info['timestamp']}, '*', '', {$info['total_time']}, {$info['count']})";
    $conn->query($query);
}
$conn->close();

http_response_code(200);
exit;
