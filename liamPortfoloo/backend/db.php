<?php

declare(strict_types=1);

function getDbConnection(): PDO
{
    $host = getenv('DB_HOST') ?: $_ENV['DB_HOST'] ?? 'localhost';
    $dbname = getenv('DB_NAME') ?: $_ENV['DB_NAME'] ?? 'digital_cv';
    $username = getenv('DB_USER') ?: $_ENV['DB_USER'] ?? 'root';
    $password = getenv('DB_PASS') ?: $_ENV['DB_PASS'] ?? '';
    $port = getenv('DB_PORT') ?: $_ENV['DB_PORT'] ?? '3306';

    try {
        $pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );

        return $pdo;
    } catch (PDOException $e) {
        error_log('Database connection failed: ' . $e->getMessage());
        throw $e;
    }
}

if (php_sapi_name() === 'cli' && basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    try {
        $pdo = getDbConnection();
        echo "Database connection successful.\n";
    } catch (PDOException $e) {
        http_response_code(500);
        echo "Database connection failed: " . $e->getMessage() . "\n";
        exit(1);
    }
}
