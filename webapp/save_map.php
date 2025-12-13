<?php
require 'db.php';

header('Content-Type: application/json');

// Get JSON Input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO map_requests (name, center_lat, center_lon, dest_lat, dest_lon, radius, hex_size) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['name'] ?? 'My Map',
        $input['center_lat'],
        $input['center_lon'],
        $input['dest_lat'],
        $input['dest_lon'],
        $input['radius'],
        $input['hex_size'] ?? 0.4
    ]);

    echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>