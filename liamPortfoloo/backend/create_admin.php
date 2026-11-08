<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';

$username = getenv('ADMIN_USERNAME') ?: 'MCKEEVER';
$password = getenv('ADMIN_PASSWORD') ?: '';

if ($username === '' || strlen($username) > 50 || $password === '' || strlen($password) < 12) {
    fwrite(STDERR, "Set ADMIN_PASSWORD to a password of at least 12 characters before running this script.\n");
    exit(1);
}

try {
    $pdo = getDbConnection();
    $statement = $pdo->prepare(
        'INSERT INTO admins (username, password_hash)
         VALUES (:username, :password_hash)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)'
    );
    $statement->execute([
        ':username' => $username,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
    fwrite(STDOUT, "Admin account created or password updated for username: {$username}\n");
} catch (PDOException $exception) {
    error_log('Admin account setup failed: ' . $exception->getMessage());
    fwrite(STDERR, "Could not create the admin account. Confirm the database connection and schema.\n");
    exit(1);
}
