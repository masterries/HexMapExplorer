<?php
require 'db.php';
header('Content-Type: application/json');

// Input: { "action": "get"|"set", "data": ... }
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['action'])) {
    echo json_encode(["status" => "error", "message" => "Invalid Input"]);
    exit;
}

$action = $input['action'];

if ($action === 'get') {
    // Input data: ["key1", "key2", ...]
    $keys = $input['data'];
    if (empty($keys)) {
        echo json_encode([]);
        exit;
    }

    // Create placeholders for IN clause
    $placeholders = str_repeat('?,', count($keys) - 1) . '?';
    $sql = "SELECT cache_key, duration FROM driving_time_cache WHERE cache_key IN ($placeholders)";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($keys);
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // returns [key => duration]
        echo json_encode($rows);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }

} elseif ($action === 'set') {
    // Input data: { "key1": 12.5, "key2": 10.0 }
    $items = $input['data'];
    if (empty($items)) {
        echo json_encode(["status" => "success", "count" => 0]);
        exit;
    }

    try {
        $pdo->beginTransaction();
        $sql = "INSERT INTO driving_time_cache (cache_key, duration) VALUES (?, ?) ON DUPLICATE KEY UPDATE duration = VALUES(duration)";
        $stmt = $pdo->prepare($sql);

        $count = 0;
        foreach ($items as $key => $duration) {
            $stmt->execute([$key, $duration]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(["status" => "success", "count" => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>