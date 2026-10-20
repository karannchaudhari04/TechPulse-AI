-- Merge the two development categories and rename the DSA category while preserving references.

UPDATE categories
SET name = 'Problem Solving',
    description = 'Master the fundamentals of DSA and solve complex problems'
WHERE name = 'DSA & Problem Solving';

-- Preserve mobile-development preferences by merging them into the web-development category.
INSERT INTO user_preferences (user_id, category_id)
SELECT mobile_pref.user_id, web_category.id
FROM user_preferences mobile_pref
JOIN categories mobile_category ON mobile_category.id = mobile_pref.category_id
JOIN categories web_category ON web_category.name = 'Web Development'
WHERE mobile_category.name = 'Mobile Development'
  AND NOT EXISTS (
      SELECT 1
      FROM user_preferences existing_pref
      WHERE existing_pref.user_id = mobile_pref.user_id
        AND existing_pref.category_id = web_category.id
  );

DELETE mobile_pref
FROM user_preferences mobile_pref
JOIN categories mobile_category ON mobile_category.id = mobile_pref.category_id
WHERE mobile_category.name = 'Mobile Development';

-- Some deployed databases still contain the legacy bites table even though V5 drops it.
-- Remap its category foreign keys only when that table exists.
SET @techpulse_bites_exists = (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'bites'
);
SET @techpulse_remap_bites_sql = IF(
    @techpulse_bites_exists > 0,
    'UPDATE bites b JOIN categories mobile_category ON mobile_category.id = b.category_id JOIN categories development_category ON development_category.name = ''Web Development'' SET b.category_id = development_category.id WHERE mobile_category.name = ''Mobile Development''',
    'SELECT 1'
);
PREPARE techpulse_remap_bites_stmt FROM @techpulse_remap_bites_sql;
EXECUTE techpulse_remap_bites_stmt;
DEALLOCATE PREPARE techpulse_remap_bites_stmt;

DELETE FROM categories WHERE name = 'Mobile Development';
UPDATE categories
SET name = 'Development',
    description = 'Build web, mobile, frontend, and backend applications'
WHERE name = 'Web Development';

-- Keep stored event and profile category labels aligned with the canonical taxonomy.
UPDATE technology_event
SET categories_json = REPLACE(categories_json, 'DSA & Problem Solving', 'Problem Solving')
WHERE categories_json LIKE '%DSA & Problem Solving%';

UPDATE technology_event
SET categories_json = REPLACE(REPLACE(categories_json, 'Web Development', 'Development'), 'Mobile Development', 'Development')
WHERE categories_json LIKE '%Web Development%' OR categories_json LIKE '%Mobile Development%';

UPDATE user_profile
SET categories_json = REPLACE(REPLACE(REPLACE(categories_json, 'DSA & Problem Solving', 'Problem Solving'), 'Web Development', 'Development'), 'Mobile Development', 'Development')
WHERE categories_json LIKE '%DSA & Problem Solving%'
   OR categories_json LIKE '%Web Development%'
   OR categories_json LIKE '%Mobile Development%';

-- Consolidate duplicate user interest keys before deleting legacy labels.
INSERT INTO user_interest (user_id, interest_type, interest_key, weight, last_interaction_at)
SELECT user_id, interest_type, 'Development', MAX(weight), MAX(last_interaction_at)
FROM user_interest
WHERE interest_type = 'CATEGORY' AND interest_key IN ('Web Development', 'Mobile Development')
GROUP BY user_id, interest_type
ON DUPLICATE KEY UPDATE
    weight = GREATEST(user_interest.weight, VALUES(weight)),
    last_interaction_at = GREATEST(user_interest.last_interaction_at, VALUES(last_interaction_at));

DELETE FROM user_interest
WHERE interest_type = 'CATEGORY' AND interest_key IN ('Web Development', 'Mobile Development');

INSERT INTO user_interest (user_id, interest_type, interest_key, weight, last_interaction_at)
SELECT user_id, interest_type, 'Problem Solving', MAX(weight), MAX(last_interaction_at)
FROM user_interest
WHERE interest_type = 'CATEGORY' AND interest_key = 'DSA & Problem Solving'
GROUP BY user_id, interest_type
ON DUPLICATE KEY UPDATE
    weight = GREATEST(user_interest.weight, VALUES(weight)),
    last_interaction_at = GREATEST(user_interest.last_interaction_at, VALUES(last_interaction_at));

DELETE FROM user_interest
WHERE interest_type = 'CATEGORY' AND interest_key = 'DSA & Problem Solving';
