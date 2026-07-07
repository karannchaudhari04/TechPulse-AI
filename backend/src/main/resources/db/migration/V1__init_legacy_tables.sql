-- db/migration/V1__init_legacy_tables.sql

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    profile_picture_url VARCHAR(500),
    role VARCHAR(50) DEFAULT 'USER',
    push_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_firebase_uid (firebase_uid)
);

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content_summary TEXT NOT NULL,
    original_source_url VARCHAR(500) NOT NULL,
    author_attribution VARCHAR(150),
    thumbnail_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'DRAFT',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_category_status_published (category_id, status, published_at DESC),
    INDEX idx_status_published (status, published_at DESC)
);

CREATE TABLE IF NOT EXISTS bookmarks (
    user_id BIGINT NOT NULL,
    bite_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, bite_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_id) REFERENCES bites(id) ON DELETE CASCADE,
    INDEX idx_user_bookmark (user_id, created_at DESC)
);

CREATE TABLE IF NOT EXISTS user_viewed_bites (
    user_id BIGINT NOT NULL,
    bite_id BIGINT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, bite_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_id) REFERENCES bites(id) ON DELETE CASCADE,
    INDEX idx_user_viewed (user_id)
);

CREATE TABLE IF NOT EXISTS raw_ingestion (
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
    importance_score DOUBLE DEFAULT 0.0,
    importance_level VARCHAR(50),
    importance_confidence DOUBLE DEFAULT 0.0,
    importance_breakdown_json TEXT,
    importance_reasons_json TEXT,
    event_first_seen TIMESTAMP NULL,
    event_last_updated TIMESTAMP NULL,
    event_source_count INT DEFAULT 1,
    INDEX idx_raw_run_id (run_id),
    INDEX idx_raw_status (processing_status),
    INDEX idx_raw_event_id (event_id),
    INDEX idx_raw_canonical_url (canonical_url),
    INDEX idx_raw_published_at (published_at),
    INDEX idx_raw_fetched_at (fetched_at)
);
