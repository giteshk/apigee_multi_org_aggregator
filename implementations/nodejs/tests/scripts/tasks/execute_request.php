<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/30/17
 * Time: 3:40 PM
 */

function execute_aggregator_request($org_url_mapping, $developer, $app , $count_function) {
    $all_responses = [];
    $request_stats = [];
    $new_org_url_mapping = $org_url_mapping;
    foreach($org_url_mapping as $org=>$url) {
        $new_org_url_mapping[$org] = "https://api.enterprise.apigee.com/v1" . $url;
        if($org == get_aggregator_proxy_fake_org_name()) {
            //$new_org_url_mapping[$org] = "http://apigee-aggregator.appspot.com" . str_replace("/" . get_aggregator_proxy_fake_org_name() ."/", "/" . get_aggregator_proxy_deployed_org() . "/", $url);
          $new_org_url_mapping[$org] = "http://localhost/apigee_multi_org_aggregator/tests/index.php?q=" . str_replace("/" . get_aggregator_proxy_fake_org_name() ."/", "/" . get_aggregator_proxy_deployed_org() . "/", $url);
        }
    }

    foreach($new_org_url_mapping as $org => $url) {
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

    //$conn = new pdo('mysql:unix_socket=/cloudsql/apigee-aggregator:us-central1:aggregator;dbname=analytics_db', 'root', '');
    $conn = new pdo('mysql:host=localhost;dbname=aggregator', 'root', 'root');

    foreach($request_stats as $org => $info) {
        $query = "INSERT INTO analytics values('{$org}', '{$_SERVER['REQUEST_URI']}', {$info['timestamp']}, '{$developer}', '{$app}', {$info['total_time']}, {$info['count']})";
        $conn->query($query);
    }
    $conn = null;
    return $all_responses;
}

function get_aggregator_proxy_deployed_org(){
    return get_all_aggregated_orgs()[0];
}

function get_aggregator_proxy_fake_org_name(){
    return 'aggregator_proxy';
}
function get_all_aggregated_orgs() {
    return ['gitesh', 'gitesh1', 'gitesh2', 'gitesh3', get_aggregator_proxy_fake_org_name()];
}