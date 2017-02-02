<?php

$orgs = ['gitesh', 'gitesh1', 'gitesh2', 'gitesh3'];
$mgmt_endpoint = "https://api.enterprise.apigee.com/v1";

$request_uri = str_replace($_SERVER['SCRIPT_NAME'] . "/", '', $_SERVER['REQUEST_URI']);
$url_obj = parse_url($request_uri);
$query = isset($url_obj['query']) ? $url_obj['query'] : '';
$request_uri = $url_obj['path'];
$query_parsed = NULL;
parse_str($query, $query_parsed);

$args = explode("/", $request_uri);
if (count($args) < 2 && ($args[0] != 'o' || $args[0] !== 'organization')) {
  http_response_code(404);
  exit;
}

if (count($args) >= 3) {
  $entity_type = $args[2];
  switch ($entity_type) {
    case 'apiproducts':
      if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(403);
        exit;
      }
    case 'developers':
      if(count($args) == 3) {
        break;
      }
    case 'apps':
      if(count($args) >= 4) { //Patterns like /o/orgname/apps/<id> or /o/orgname/apiproducts/<id> or /o/orgname/developers/<id>
        $id = urldecode($args[3]);
        $arr = explode("}}", $id);
        if(count($arr)>1) {
          $orgs = [str_replace("{{", "", $arr[0])]; // Replace the orgname
          $args[3] = $arr[1]; //Replace the ID after removing the
        } else{
          $orgs = [$args[1]];
        }
      }
      if ($_SERVER['REQUEST_METHOD'] === 'GET'){// patterns like /o/orgname/apps or o/orgname/apiproducts
        $headers = getallheaders();
        unset($headers['Host']);
        foreach ($headers as $name => $value) {
          $formatted_headers[] = "$name: $value";
        }
        $headers = [];
        $mh = curl_multi_init();
        $ch = array();
        foreach ($orgs as $org) {
          $headers[$org]['request'] = $formatted_headers;
          $_args = $args;
          $_args[1] = $org;
          $ch[$org] = curl_init("$mgmt_endpoint/" . implode("/", $_args) . ($query ? "?$query" : ""));
          curl_setopt($ch[$org], CURLOPT_HTTPHEADER, $formatted_headers);
          curl_setopt($ch[$org], CURLOPT_RETURNTRANSFER, 1);
          curl_setopt($ch[$org], CURLOPT_ENCODING, "identity");
          curl_multi_add_handle($mh, $ch[$org]);
        }
        $active = NULL;
        //execute the handles
        do {
          $mrc = curl_multi_exec($mh, $active);
          curl_multi_select($mh);
        } while ($mrc == CURLM_CALL_MULTI_PERFORM);

        while ($active && $mrc == CURLM_OK) {
          if (curl_multi_select($mh) != -1) {
            do {
              $mrc = curl_multi_exec($mh, $active);
            } while ($mrc == CURLM_CALL_MULTI_PERFORM);
          }
        }

        $responses = [];
        $expanded = isset($query_parsed['expand']) && ($query_parsed['expand'] == TRUE);
        //close the handles
        foreach ($orgs as $org) {
          curl_multi_remove_handle($mh, $ch[$org]);
          $content = @json_decode(curl_multi_getcontent($ch[$org]));
          $output_arr = NULL;
          if ($entity_type == 'apps') {
            $output_arr =  is_object($content) && isset($content->app) ? $content->app : $content;
          }
          else if ($entity_type == 'apiproducts') {
            $output_arr =  is_object($content) && isset($content->apiProduct) ? $content->apiProduct : $content;
          } if ($entity_type == 'developers') {
            $output_arr =  is_object($content) && isset($content->developer) ? $content->developer : $content;
          }
          if (count($args) >= 4) {
            $output_arr = [$output_arr];
          }
          array_walk($output_arr, function ($value) use ($org, &$responses) {
            if (is_object($value)) {
              if(isset($value->name)) {
                $value->name = "{{{$org}}}{$value->name}";
              }
              if(isset($value->apps)) {
                $value->apps = [];
              }
              if(isset($value->companies)) {
                $value->companies = [];
              }
              if(isset($value->attributes)) {
                $value->attributes[] = [
                  "name" => "_org_name",
                  "value" => $org
                ];
              }
              if(isset($value->apiProducts)) {
                foreach($value->apiProducts as &$val) {
                  $val = "{{{$org}}}$val";
                }
              }
              if(isset($value->developerId)) {
                $value->developerId = "{{{$org}}}{$value->developerId}";
              }
              if(isset($value->credentials)){
                foreach($value->credentials as &$cred) {
                  foreach($cred->apiProducts as &$info){
                    $info->apiproduct = "{{{$org}}}{$info->apiproduct}";
                  }
                }
              }
            }
            else {
              $value = "{{{$org}}}$value";
            }
            $responses[] = $value;
          });
          $response_headers[] = [curl_getinfo($ch[$org], CURLINFO_HTTP_CODE), curl_getinfo($ch[$org], CURLINFO_CONTENT_TYPE)] ;
          curl_close($ch[$org]);
        }
        if(count($args) >=4 ) {
          $responses = array_pop($responses);
        } else if ($expanded) {
          $responses = [ ($entity_type == 'apps' ? "app" : ($entity_type == 'apiproducts'? "apiProduct":"developer")) => $responses];
        }
        $response_header = array_pop($response_headers);
        http_response_code($response_header[0]);
        header('Content-Type: '. $response_header[1]);
        print json_encode($responses);
        exit;
      }
  }
}

header("Location: $mgmt_endpoint/$request_uri". ($query ? "?$query" : ""));
exit;
