<?php

$orgs = ['gitesh', 'gitesh1', 'gitesh2', 'gitesh3'];
$conn = new pdo('mysql:host=localhost;dbname=aggregator', 'root', 'root');
$conn->query("truncate apps; truncate developers;");
$mgmt_endpoint = "https://api.enterprise.apigee.com/v1";
    foreach($orgs as $org) {
        error_log("********************** Processing $org *************************");
        foreach(['developers', 'apps'] as $type) {
            error_log("********************** Processing $org $type *************************");
            $curl = curl_init($mgmt_endpoint . "/o/$org/$type?expand=true");
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
            error_log("********************** Received $org $type *************************");
            if (curl_getinfo($curl, CURLINFO_HTTP_CODE) === 200) {
                $response_obj = json_decode($result);
                $entities = ($type == 'apps') ? $response_obj->app : $response_obj->developer;
                foreach ($entities as $entity) {
                    if ($type == 'apps') {
                        $conn->query("INSERT INTO apps values('$entity->appId', '$entity->name','$entity->developerId','$org')");
                    } else {
                        $conn->query("INSERT INTO developers values('$entity->developerId', '$entity->email','$org')");
                    }
                }
                error_log("********************** finished populating $type table for $org  *************************");
            }
            curl_close($curl);
        }
    }
$conn = null;