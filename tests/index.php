<?php
/**
 * Created by PhpStorm.
 * User: gkoli
 * Date: 1/27/17
 * Time: 5:47 PM
 */

?>
<?php
$conn = new pdo('mysql:unix_socket=/cloudsql/apigee-aggregator:us-central1:aggregator;dbname=analytics_db', 'root', '');
$results = $conn->query('select response_time, timestamp from analytics where dimension = "all_developers" order by timestamp asc')->fetchAll();
foreach($results as $row) {
  print $row['response_time'] . "\t\"" .  date("F j, Y, g:i a", $row['timestamp']) . "\"\n";
}?>