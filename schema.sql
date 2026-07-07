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


CREATE TABLE IF NOT EXISTS technology_event (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    categories_json TEXT,
    credibility_score DOUBLE DEFAULT 0.0,
    importance_score DOUBLE DEFAULT 0.0,
    merge_confidence DOUBLE DEFAULT 1.0,
    first_seen TIMESTAMP NULL,
    last_updated TIMESTAMP NULL,
    lifecycle_status VARCHAR(50),
    major_version INT,
    minor_version INT,
    patch_version INT,
    version_string VARCHAR(50),
    entities_json TEXT,
    summary TEXT,
    technical_impact TEXT,
    developer_impact TEXT,
    enterprise_impact TEXT,
    migration_notes TEXT,
    breaking_changes TEXT,
    security_notes TEXT,
    official_links_json TEXT,
    llm_model VARCHAR(50),
    prompt_version VARCHAR(50),
    response_schema_version VARCHAR(50),
    summary_status VARCHAR(50) DEFAULT 'NEW',
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    estimated_cost_usd DOUBLE DEFAULT 0.0,
    estimated_cost_inr DOUBLE DEFAULT 0.0,
    generation_latency INT DEFAULT 0,
    summary_generated_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS kg_node (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    normalized_name VARCHAR(150) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    mention_count INT DEFAULT 1,
    trend_score DOUBLE DEFAULT 0.0,
    trend_label VARCHAR(50) DEFAULT 'Stable',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kg_edge (
    id VARCHAR(36) PRIMARY KEY,
    source_node_id VARCHAR(36) NOT NULL,
    target_node_id VARCHAR(36) NOT NULL,
    relation_type VARCHAR(50) NOT NULL,
    weight DOUBLE DEFAULT 1.0,
    confidence DOUBLE DEFAULT 0.5,
    evidence_count INT DEFAULT 1,
    supporting_urls TEXT,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_node_id) REFERENCES kg_node(id),
    FOREIGN KEY (target_node_id) REFERENCES kg_node(id),
    UNIQUE KEY uq_source_target_rel (source_node_id, target_node_id, relation_type)
);

CREATE TABLE IF NOT EXISTS event_timeline (
    id VARCHAR(36) PRIMARY KEY,
    entity_name VARCHAR(150) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    lifecycle_type VARCHAR(50) NOT NULL,
    version VARCHAR(50),
    event_timestamp TIMESTAMP NULL,
    FOREIGN KEY (event_id) REFERENCES technology_event(id)
);

CREATE TABLE IF NOT EXISTS interaction_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    interaction_value VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_interaction_type (user_id, interaction_type, created_at)
);

CREATE TABLE IF NOT EXISTS user_profile (
    user_id BIGINT PRIMARY KEY,
    preferred_difficulty_level VARCHAR(50) DEFAULT 'ALL',
    categories_json TEXT,
    technologies_json TEXT,
    frameworks_json TEXT,
    languages_json TEXT,
    cloud_providers_json TEXT,
    companies_json TEXT,
    products_json TEXT,
    cves_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_interest (
    user_id BIGINT NOT NULL,
    interest_type VARCHAR(50) NOT NULL,
    interest_key VARCHAR(255) NOT NULL,
    weight DOUBLE DEFAULT 0.0,
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, interest_type, interest_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_follow (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_user_follow_entity (user_id, entity_name, entity_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_saved_event (
    user_id BIGINT NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES technology_event(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_collection (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    is_auto_updating BOOLEAN DEFAULT FALSE,
    query_criteria_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collection_event (
    collection_id BIGINT NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, event_id),
    FOREIGN KEY (collection_id) REFERENCES user_collection(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES technology_event(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    score DOUBLE NOT NULL,
    shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_clicked BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES technology_event(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_rule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_value VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    event_id VARCHAR(36),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    query_text VARCHAR(500) NOT NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



