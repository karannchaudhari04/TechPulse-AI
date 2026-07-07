-- db/migration/V2__add_event_intelligence.sql

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
