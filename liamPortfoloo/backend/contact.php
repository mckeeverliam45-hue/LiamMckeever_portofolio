<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(
        ['message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function field(string $name): string
{
    $value = $_POST[$name] ?? '';

    return is_string($value) ? trim($value) : '';
}

function characterLength(string $value): ?int
{
    $length = preg_match_all('/./us', $value, $matches);

    return $length === false ? null : $length;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'Method not allowed.');
}

$name = field('name');
$email = field('email');
$subject = field('subject');
$message = field('message');

$nameLength = characterLength($name);
$emailLength = characterLength($email);
$subjectLength = characterLength($subject);
$messageLength = characterLength($message);

if (
    $nameLength === null ||
    $emailLength === null ||
    $subjectLength === null ||
    $messageLength === null
) {
    respond(422, 'Please enter valid text in all fields.');
}

if (
    $name === '' ||
    $email === '' ||
    $subject === '' ||
    $message === '' ||
    $nameLength > 100 ||
    $emailLength > 150 ||
    $subjectLength > 200 ||
    $messageLength > 5000 ||
    filter_var($email, FILTER_VALIDATE_EMAIL) === false
) {
    respond(422, 'Please check the required fields and try again.');
}

try {
    $pdo = getDbConnection();
    $statement = $pdo->prepare(
        'INSERT INTO messages (name, email, subject, message)
         VALUES (:name, :email, :subject, :message)'
    );
    $statement->execute([
        ':name' => $name,
        ':email' => $email,
        ':subject' => $subject,
        ':message' => $message,
    ]);
} catch (PDOException $exception) {
    error_log('Contact message could not be saved: ' . $exception->getMessage());
    respond(500, 'Your message could not be saved right now. Please try again later.');
}

respond(201, 'Thanks for reaching out. Your message has been sent.');
