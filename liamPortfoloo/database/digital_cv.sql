CREATE DATABASE IF NOT EXISTS digital_cv;

USE digital_cv;

-- Table for employer contact messages
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for administrator accounts
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for portfolio projects
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    project_url VARCHAR(255),
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for education records
CREATE TABLE IF NOT EXISTS education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution VARCHAR(150) NOT NULL,
    qualification VARCHAR(150) NOT NULL,
    start_year YEAR,
    end_year YEAR,
    description TEXT
);

CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the current portfolio content only when the tables are empty.
INSERT INTO projects (title, description, project_url, image)
SELECT seed.title, seed.description, seed.project_url, seed.image
FROM (
    SELECT
        'Personal Portfolio Website' AS title,
        'A personal website designed to present professional information, skills, achievements, and contact details clearly and confidently.' AS description,
        NULL AS project_url,
        NULL AS image
    UNION ALL
    SELECT
        'Graphic Design Samples',
        'Created posters, flyers, and branded materials used for communication, promotion, and marketing support for clients and organizations.',
        NULL,
        NULL
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM projects);

INSERT INTO education (institution, qualification, start_year, end_year, description)
SELECT seed.institution, seed.qualification, seed.start_year, seed.end_year, seed.description
FROM (
    SELECT
        'NYS Engineering Institute' AS institution,
        'Certificate Level 6' AS qualification,
        2025 AS start_year,
        NULL AS end_year,
        'Studying computer science with a focus on web application development, programming, databases, networking, computer systems, graphic design, operating systems, and computer architecture.' AS description
    UNION ALL
    SELECT
        'Joel Omino Secondary School',
        'Secondary Education',
        2022,
        2022,
        'Completed secondary education and sat for the Kenya Certificate of Secondary Education (KCSE), attaining a mean grade of C (Plain).'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM education);

INSERT INTO skills (name, category, description, display_order)
SELECT seed.name, seed.category, seed.description, seed.display_order
FROM (
    SELECT
        'Web Development' AS name,
        'Development' AS category,
        'HTML, CSS, JavaScript, responsive layouts, and accessible interfaces.' AS description,
        1 AS display_order
    UNION ALL
    SELECT
        'Computer Support',
        'IT Support',
        'Operating system installation, troubleshooting, and practical user support.',
        2
    UNION ALL
    SELECT
        'Networking',
        'Infrastructure',
        'Local area network setup, router configuration, and network access support.',
        3
    UNION ALL
    SELECT
        'Graphic Design',
        'Creative',
        'Visual materials including posters, flyers, banners, and basic branding.',
        4
    UNION ALL
    SELECT
        'Digital Communication',
        'Professional',
        'Clear writing, collaboration, and thoughtful presentation of technical ideas.',
        5
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM skills);