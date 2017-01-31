<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/30/17
 * Time: 3:40 PM
 */

function execute_aggregator_request($org_url_mapping, $metric, $developer, $app , $count_function) {
    $all_responses = [];
    $request_stats = [];
    $url = array_values($org_url_mapping)[0];
    $apigee_proxy_url = str_replace("https://api.enterprise.apigee.com/v1", "https://gitesh-prod.apigee.net/multiorg", $url);
    foreach($org_url_mapping + ['apigee_proxy' => $apigee_proxy_url] as $org => $url) {
        $time = time();
        $curl = curl_init( $url);
        $headers = [
            'Accept: application/json',
            'Authorization: Basic ' . base64_encode('gitesh@gkoli.info:p0o9i8U7'),
        ];

        $options = [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 300,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_SSL_VERIFYHOST => FALSE,
            CURLOPT_SSL_VERIFYPEER => FALSE,
        ];
        curl_setopt_array($curl, $options);
        $start = microtime(true);
        $result = curl_exec($curl);
        $time_elapsed_secs = microtime(true) - $start;
        if(curl_getinfo($curl, CURLINFO_HTTP_CODE) === 200) {
            $response_obj = json_decode($result);
            $request_stats[$org] = ['count' => $count_function($response_obj), 'total_time' => $time_elapsed_secs, 'timestamp' => $time];
            $all_responses[$org] = $response_obj;
        }
        curl_close($curl);
    }

    $conn = new pdo('mysql:unix_socket=/cloudsql/apigee-aggregator:us-central1:aggregator;dbname=analytics_db', 'root', '');

    foreach($request_stats as $org => $info) {
        $query = "INSERT INTO analytics values('{$org}', '{$metric}', {$info['timestamp']}, '{$developer}', '{$app}', {$info['total_time']}, {$info['count']})";
        $conn->query($query);
    }
    $conn = null;
    return $all_responses;
}