-- ===========================================================================
-- TechPulse AI Database Schema
-- Focus: Fast read performance, foreign key integrity, and easy pagination.
-- ===========================================================================

-- 1. Users Table
-- Stores core user details, authenticating primarily via Firebase UID.
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL UNIQUE,  -- Linked to Firebase Auth
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    profile_picture_url VARCHAR(500),
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',  -- Admins can draft/publish bites
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_firebase_uid (firebase_uid)       -- Index for fast user lookup post-login
);

-- 2. Categories Table
-- Represents core tags/subjects (e.g., "DSA", "Cybersecurity").
CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Preferences Table (Users <-> Categories)
-- Resolves the many-to-many relationship of a user's selected interests.
CREATE TABLE user_preferences (
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 4. Bites Table
-- The central content unit (short daily tip/news snippet).
CREATE TABLE bites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content_summary TEXT NOT NULL,              -- The 80-150 words AI/Admin summary
    original_source_url VARCHAR(500) NOT NULL,  -- Mandatory source attribution
    author_attribution VARCHAR(150),
    thumbnail_url VARCHAR(500),                 -- For FlashList cover image
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    -- Composite Index for feed queries filtering by status, category and sorted by published date
    INDEX idx_category_status_published (category_id, status, published_at DESC),
    -- Index for "For You" generic feed ignoring category constraints
    INDEX idx_status_published (status, published_at DESC)
);

-- 5. Bookmarks Table (Users <-> Bites)
-- Resolves many-to-many relation for saving bites.
CREATE TABLE bookmarks (
    user_id BIGINT NOT NULL,
    bite_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, bite_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_id) REFERENCES bites(id) ON DELETE CASCADE,
    INDEX idx_user_bookmark (user_id, created_at DESC) -- Fetch latest bookmarks quickly
);

-- 6. User Viewed Bites Table (Users <-> Bites)
-- Tracks which bites a user has viewed to exclude them from main feeds.
CREATE TABLE user_viewed_bites (
    user_id BIGINT NOT NULL,
    bite_id BIGINT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, bite_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_id) REFERENCES bites(id) ON DELETE CASCADE,
    INDEX idx_user_viewed (user_id)
);

-- 7. Raw Ingestion Table
-- Persists raw technology updates fetched from various internet sources.
CREATE TABLE raw_ingestion (
    id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36) NOT NULL,
    source_name VARCHAR(150) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    raw_content LONGTEXT NOT NULL,
    url VARCHAR(512) NOT NULL,
    canonical_url VARCHAR(512),
    published_at TIMESTAMP NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'NEW',
    event_id VARCHAR(36),
    credibility_score DOUBLE DEFAULT 0.0,
    credibility_level VARCHAR(50),
    credibility_confidence DOUBLE DEFAULT 0.0,
    score_baseline DOUBLE DEFAULT 0.0,
    score_official_bonus DOUBLE DEFAULT 0.0,
    score_agreement_bonus DOUBLE DEFAULT 0.0,
    score_clickbait_penalty DOUBLE DEFAULT 0.0,
    is_official BOOLEAN DEFAULT FALSE,
    INDEX idx_raw_run_id (run_id),
    INDEX idx_raw_status (processing_status),
    INDEX idx_raw_event_id (event_id),
    INDEX idx_raw_canonical_url (canonical_url),
    INDEX idx_raw_published_at (published_at),
    INDEX idx_raw_fetched_at (fetched_at)
);

