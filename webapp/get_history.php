<?php
require 'db.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT * FROM map_requests ORDER BY created_at DESC LIMIT 50");
    $data = $stmt->fetchAll();
    echo json_encode($data);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>