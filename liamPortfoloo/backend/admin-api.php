<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function requestData(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        respond(400, ['message' => 'Invalid request body.']);
    }

    return $data;
}

function textValue(array $data, string $key): string
{
    $value = $data[$key] ?? '';

    return is_string($value) ? trim($value) : '';
}

function textLength(string $value): ?int
{
    $length = preg_match_all('/./us', $value, $matches);

    return $length === false ? null : $length;
}

function validText(string $value, int $maxLength): bool
{
    $length = textLength($value);

    return $length !== null && $length > 0 && $length <= $maxLength;
}

function requireCsrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';

    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        respond(403, ['message' => 'Your session has expired. Refresh the page and try again.']);
    }
}

function recordId(): int
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false || $id === null) {
        respond(400, ['message' => 'A valid record ID is required.']);
    }

    return $id;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = $_GET['resource'] ?? '';

if ($method === 'GET' && $resource === 'session') {
    if (isset($_SESSION['admin_id'])) {
        respond(200, [
            'authenticated' => true,
            'username' => $_SESSION['admin_username'] ?? '',
            'csrfToken' => $_SESSION['csrf_token'] ?? '',
        ]);
    }

    respond(200, ['authenticated' => false]);
}

if ($method === 'POST' && $resource === 'session') {
    $data = requestData();
    $username = textValue($data, 'username');
    $password = $data['password'] ?? null;

    if (
        !is_string($password) ||
        $username === '' ||
        strlen($username) > 50 ||
        $password === '' ||
        strlen($password) > 4096
    ) {
        respond(422, ['message' => 'Enter your username and password.']);
    }

    try {
        $pdo = getDbConnection();
        $statement = $pdo->prepare('SELECT id, username, password_hash FROM admins WHERE username = :username LIMIT 1');
        $statement->execute([':username' => $username]);
        $admin = $statement->fetch();
    } catch (PDOException $exception) {
        error_log('Admin sign-in lookup failed: ' . $exception->getMessage());
        respond(500, ['message' => 'Sign in is unavailable right now. Please try again later.']);
    }

    if (!is_array($admin) || !password_verify($password, (string) $admin['password_hash'])) {
        respond(401, ['message' => 'The username or password is incorrect.']);
    }

    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int) $admin['id'];
    $_SESSION['admin_username'] = (string) $admin['username'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    respond(200, [
        'authenticated' => true,
        'username' => $_SESSION['admin_username'],
        'csrfToken' => $_SESSION['csrf_token'],
    ]);
}

if ($method === 'GET' && $resource === 'portfolio') {
    try {
        $pdo = getDbConnection();
        $projects = $pdo->query(
            'SELECT id, title, description, project_url, image
             FROM projects ORDER BY created_at DESC, id DESC'
        )->fetchAll();
        $education = $pdo->query(
            'SELECT id, institution, qualification, start_year, end_year, description
             FROM education ORDER BY start_year DESC, id DESC'
        )->fetchAll();
        $skills = $pdo->query(
            'SELECT id, name, category, description
             FROM skills ORDER BY display_order ASC, id ASC'
        )->fetchAll();
    } catch (PDOException $exception) {
        error_log('Public portfolio records could not be loaded: ' . $exception->getMessage());
        respond(500, ['message' => 'Portfolio content could not be loaded.']);
    }

    respond(200, ['projects' => $projects, 'education' => $education, 'skills' => $skills]);
}

if ($method === 'DELETE' && $resource === 'session') {
    if (!isset($_SESSION['admin_id'])) {
        respond(401, ['message' => 'You are not signed in.']);
    }
    requireCsrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => 'Strict',
        ]);
    }
    session_destroy();
    respond(200, ['message' => 'Signed out.']);
}

if (!isset($_SESSION['admin_id'])) {
    respond(401, ['message' => 'Please sign in to continue.']);
}

if (!in_array($resource, ['messages', 'projects', 'education', 'skills'], true)) {
    respond(404, ['message' => 'The requested resource was not found.']);
}

try {
    $pdo = getDbConnection();

    if ($method === 'GET') {
        if ($resource === 'messages') {
            $records = $pdo->query(
                'SELECT id, name, email, subject, message, created_at
                 FROM messages ORDER BY created_at DESC, id DESC'
            )->fetchAll();
        } elseif ($resource === 'projects') {
            $records = $pdo->query(
                'SELECT id, title, description, project_url, image, created_at
                 FROM projects ORDER BY created_at DESC, id DESC'
            )->fetchAll();
        } elseif ($resource === 'education') {
            $records = $pdo->query(
                'SELECT id, institution, qualification, start_year, end_year, description
                 FROM education ORDER BY start_year DESC, id DESC'
            )->fetchAll();
        } else {
            $records = $pdo->query(
                'SELECT id, name, category, description
                 FROM skills ORDER BY display_order ASC, id ASC'
            )->fetchAll();
        }

        respond(200, ['records' => $records]);
    }

    requireCsrf();
    $data = requestData();

    if ($method === 'DELETE') {
        $id = recordId();
        $statement = $pdo->prepare("DELETE FROM {$resource} WHERE id = :id");
        $statement->execute([':id' => $id]);
        if ($statement->rowCount() === 0) {
            respond(404, ['message' => 'That record no longer exists.']);
        }
        respond(200, ['message' => 'Record deleted.']);
    }

    if (!in_array($method, ['POST', 'PUT'], true) || $resource === 'messages') {
        header('Allow: GET, POST, PUT, DELETE');
        respond(405, ['message' => 'This action is not allowed.']);
    }

    if ($resource === 'skills') {
        $name = textValue($data, 'name');
        $category = textValue($data, 'category');
        $description = textValue($data, 'description');

        if (!validText($name, 150) || !validText($category, 100) || !validText($description, 5000)) {
            respond(422, ['message' => 'Enter a skill name, category, and description within the allowed length.']);
        }

        if ($method === 'POST') {
            $displayOrder = (int) $pdo->query(
                'SELECT COALESCE(MAX(display_order), 0) + 1 FROM skills'
            )->fetchColumn();
            $statement = $pdo->prepare(
                'INSERT INTO skills (name, category, description, display_order)
                 VALUES (:name, :category, :description, :display_order)'
            );
            $statement->execute([
                ':name' => $name,
                ':category' => $category,
                ':description' => $description,
                ':display_order' => $displayOrder,
            ]);
        } else {
            $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($id === false || $id === null) {
                respond(400, ['message' => 'A valid skill ID is required.']);
            }
            $statement = $pdo->prepare(
                'UPDATE skills SET name = :name, category = :category, description = :description
                 WHERE id = :id'
            );
            $statement->execute([
                ':name' => $name,
                ':category' => $category,
                ':description' => $description,
                ':id' => $id,
            ]);
            if ($statement->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT id FROM skills WHERE id = :id');
                $exists->execute([':id' => $id]);
                if (!$exists->fetch()) {
                    respond(404, ['message' => 'That skill no longer exists.']);
                }
            }
        }
        respond(200, ['message' => $method === 'POST' ? 'Skill added.' : 'Skill updated.']);
    }

    if ($resource === 'projects') {
        $title = textValue($data, 'title');
        $description = textValue($data, 'description');
        $projectUrl = textValue($data, 'project_url');
        $image = textValue($data, 'image');

        if (!validText($title, 150) || !validText($description, 5000)) {
            respond(422, ['message' => 'Enter a title and description within the allowed length.']);
        }
        if ($projectUrl !== '' && (strlen($projectUrl) > 255 || filter_var($projectUrl, FILTER_VALIDATE_URL) === false || !in_array(strtolower((string) parse_url($projectUrl, PHP_URL_SCHEME)), ['http', 'https'], true))) {
            respond(422, ['message' => 'Project links must be valid HTTP or HTTPS URLs.']);
        }
        $imageScheme = strtolower((string) parse_url($image, PHP_URL_SCHEME));
        if ($image !== '' && (
            strlen($image) > 255 ||
            ($imageScheme !== '' && !in_array($imageScheme, ['http', 'https'], true))
        )) {
            respond(422, ['message' => 'Enter a valid image path or HTTP(S) URL.']);
        }

        if ($method === 'POST') {
            $statement = $pdo->prepare(
                'INSERT INTO projects (title, description, project_url, image)
                 VALUES (:title, :description, :project_url, :image)'
            );
            $statement->execute([
                ':title' => $title,
                ':description' => $description,
                ':project_url' => $projectUrl !== '' ? $projectUrl : null,
                ':image' => $image !== '' ? $image : null,
            ]);
        } else {
            $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($id === false || $id === null) {
                respond(400, ['message' => 'A valid project ID is required.']);
            }
            $statement = $pdo->prepare(
                'UPDATE projects
                 SET title = :title, description = :description, project_url = :project_url, image = :image
                 WHERE id = :id'
            );
            $statement->execute([
                ':title' => $title,
                ':description' => $description,
                ':project_url' => $projectUrl !== '' ? $projectUrl : null,
                ':image' => $image !== '' ? $image : null,
                ':id' => $id,
            ]);
            if ($statement->rowCount() === 0 && !$pdo->query("SELECT id FROM projects WHERE id = " . (int) $id)->fetch()) {
                respond(404, ['message' => 'That project no longer exists.']);
            }
        }
        respond(200, ['message' => $method === 'POST' ? 'Project added.' : 'Project updated.']);
    }

    $institution = textValue($data, 'institution');
    $qualification = textValue($data, 'qualification');
    $description = textValue($data, 'description');
    $startYear = textValue($data, 'start_year');
    $endYear = textValue($data, 'end_year');

    if (!validText($institution, 150) || !validText($qualification, 150)) {
        respond(422, ['message' => 'Enter an institution and qualification within the allowed length.']);
    }
    if ($description !== '' && !validText($description, 5000)) {
        respond(422, ['message' => 'The description is too long or contains invalid text.']);
    }
    foreach ([$startYear, $endYear] as $year) {
        if ($year !== '' && (!preg_match('/^\d{4}$/', $year) || (int) $year < 1901 || (int) $year > 2155)) {
            respond(422, ['message' => 'Years must be between 1901 and 2155.']);
        }
    }
    if ($startYear !== '' && $endYear !== '' && (int) $endYear < (int) $startYear) {
        respond(422, ['message' => 'The end year cannot be earlier than the start year.']);
    }

    if ($method === 'POST') {
        $statement = $pdo->prepare(
            'INSERT INTO education (institution, qualification, start_year, end_year, description)
             VALUES (:institution, :qualification, :start_year, :end_year, :description)'
        );
        $statement->execute([
            ':institution' => $institution,
            ':qualification' => $qualification,
            ':start_year' => $startYear !== '' ? $startYear : null,
            ':end_year' => $endYear !== '' ? $endYear : null,
            ':description' => $description !== '' ? $description : null,
        ]);
    } else {
        $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false || $id === null) {
            respond(400, ['message' => 'A valid education record ID is required.']);
        }
        $statement = $pdo->prepare(
            'UPDATE education
             SET institution = :institution, qualification = :qualification,
                 start_year = :start_year, end_year = :end_year, description = :description
             WHERE id = :id'
        );
        $statement->execute([
            ':institution' => $institution,
            ':qualification' => $qualification,
            ':start_year' => $startYear !== '' ? $startYear : null,
            ':end_year' => $endYear !== '' ? $endYear : null,
            ':description' => $description !== '' ? $description : null,
            ':id' => $id,
        ]);
        if ($statement->rowCount() === 0 && !$pdo->query("SELECT id FROM education WHERE id = " . (int) $id)->fetch()) {
            respond(404, ['message' => 'That education record no longer exists.']);
        }
    }

    respond(200, ['message' => $method === 'POST' ? 'Education record added.' : 'Education record updated.']);
} catch (PDOException $exception) {
    error_log('Admin portfolio request failed: ' . $exception->getMessage());
    respond(500, ['message' => 'The request could not be completed. Check the database and try again.']);
}
