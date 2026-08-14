-- Database creation script for LOFO

CREATE DATABASE IF NOT EXISTS lofo_db;
USE lofo_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('lost', 'found') NOT NULL,
    location VARCHAR(150) NOT NULL,
    date_reported DATE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    is_approved BOOLEAN DEFAULT 0,
    is_resolved BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Images Table
CREATE TABLE IF NOT EXISTS images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    public_id VARCHAR(100) NULL, -- Stores Cloudinary asset reference
    average_color VARCHAR(7) NULL, -- Color HEX reference used for visual matches
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeding Default Categories
INSERT INTO categories (name) VALUES 
('Mobile'),
('Wallet'),
('Laptop'),
('Keys'),
('Bag'),
('Watch'),
('Earphones'),
('ID Card'),
('Documents'),
('Books'),
('Other')
ON DUPLICATE KEY UPDATE name=name;

-- Seeding Default Admin Account: admin / admin123
-- Password hash generated using bcrypt ($2a$10$wN9aE3zT.5kXF1i.WfE.xe9F97bZ92LgM1K/oG8Ww1K0k6b6LwX7a)
INSERT INTO admins (username, password) VALUES 
('admin', '$2a$10$wN9aE3zT.5kXF1i.WfE.xe9F97bZ92LgM1K/oG8Ww1K0k6b6LwX7a')
ON DUPLICATE KEY UPDATE username=username;

