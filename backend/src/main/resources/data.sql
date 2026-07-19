-- ============================================================
-- data.sql — Seed Data
-- Runs on startup when SQL_INIT_MODE=always (local dev)
-- Set SQL_INIT_MODE=never in Render after first deploy
-- ============================================================

-- Disable foreign key checks to safely wipe and recreate tables for a clean category reset
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE bookmarks;
TRUNCATE TABLE user_preferences;
TRUNCATE TABLE bites;
TRUNCATE TABLE categories;
TRUNCATE TABLE news_sources;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed exactly 12 fresh categories that Gemini AI uses for classification
INSERT IGNORE INTO categories (id, name, description, created_at) VALUES
(1, 'DSA & Problem Solving',   'Master the fundamentals of DSA and solve complex problems', NOW()),
(2, 'Web Development',         'Modern frameworks, frontend, and backend web tech',          NOW()),
(3, 'Mobile Development',      'Build apps for iOS & Android with Swift, Kotlin, and React Native', NOW()),
(4, 'AI & Machine Learning',   'Neural networks, LLMs, and intelligent engineering',        NOW()),
(5, 'Cloud & DevOps',          'Docker, Kubernetes, CI/CD, and cloud scaling',               NOW()),
(6, 'System Design & Backend', 'Scale distributed systems and write optimized backend code', NOW()),
(7, 'Cybersecurity',           'Auditing, security principles, and digital forensics',      NOW()),
(8, 'Data Science & Analytics','Big Data, analytics, visualization, and engineering',        NOW()),
(9, 'Product & UI/UX',         'Interface design, Figma workflows, and user psychology',    NOW()),
(10, 'Open Source & GitHub',   'Contribute to community code and master git workflows',     NOW()),
(11, 'Career & Placements',    'Cracking FAANG internships, resume optimization, and prep', NOW()),
(12, 'Emerging Tech',          'Quantum computing, Web3, blockchain, and tech future',       NOW());

-- ── Seed Sample Bites ─────────────────────────────────────────────────────────
-- Remapped to match the new category IDs exactly (1 through 12)
INSERT IGNORE INTO bites (id, category_id, title, content_summary, original_source_url, thumbnail_url, status, published_at, created_at, updated_at) VALUES
(1,  1, 'Understanding Big O Notation',
     'Mastering O(1), O(n), and O(log n) is the first step toward passing technical interviews at top firms. Big O describes how your algorithm scales — the difference between a solution that handles 10 inputs and one that handles 10 million.',
     'https://en.wikipedia.org/wiki/Big_O_notation',
     'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800',
     'PUBLISHED', NOW(), NOW(), NOW()),

(2,  4, 'The Rise of Gemini 1.5 Pro',
     'Gemini 1.5 Pro features a massive 2 million token context window, changing how we build AI-native apps. Developers can now feed entire codebases to the model and ask questions across them — a game changer for tooling.',
     'https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/',
     'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 1 MINUTE), NOW(), NOW()),

(3,  2, 'React 19: What is New?',
     'React 19 introduces Actions and improved Server Components, making apps faster and lighter. The new "use" hook simplifies async data fetching, and the compiler optimizes re-renders automatically — meaning less manual useMemo and useCallback.',
     'https://react.dev/blog/2024/04/25/react-19',
     'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 2 MINUTE), NOW(), NOW()),

(4,  4, 'Apple M4: Built for AI',
     'Apple''s M4 chip features the fastest Neural Engine ever, capable of 38 trillion operations per second. This is a powerhouse for on-device AI — running large language models locally without needing cloud connectivity.',
     'https://www.apple.com/newsroom/2024/05/apple-introduces-m4-chip/',
     'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 3 MINUTE), NOW(), NOW()),

(5,  4, 'OpenAI GPT-4o: The Omni Model',
     'OpenAI revealed GPT-4o, a model that reasons across audio, vision, and text in real time — and it''s free for all users. Response times are twice as fast as GPT-4 Turbo, bringing voice assistant capabilities to a whole new level.',
     'https://openai.com/index/hello-gpt-4o/',
     'https://images.unsplash.com/photo-1684423341311-667744213601?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 4 MINUTE), NOW(), NOW()),

(6,  12, 'NVIDIA Hits $2 Trillion Market Cap',
     'NVIDIA is now a $2 trillion company, driven by insatiable demand for AI-accelerating H100 GPUs. Every major AI lab — OpenAI, Google DeepMind, Meta AI — depends on NVIDIA hardware. For CS students, GPU programming is becoming a critical skill.',
     'https://www.nvidia.com/en-us/about-nvidia/',
     'https://images.unsplash.com/photo-1591405351990-4726e33df58d?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()),

(7,  7, 'The XZ Utils SSH Backdoor Scandal',
     'A backdoor was discovered in xz-utils, a widely used Linux compression library. A malicious actor spent two years building trust in the open source community before inserting the exploit — a reminder to audit your supply chain dependencies.',
     'https://www.openwall.com/lists/oss-security/2024/03/29/4',
     'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 6 MINUTE), NOW(), NOW()),

(8,  1, 'Mastering Graph Traversals (BFS & DFS)',
     'BFS and DFS are two of the most frequently tested algorithms in FAANG interviews. BFS finds shortest paths in unweighted graphs; DFS is ideal for cycle detection and topological sorting. Master these and you unlock dozens of LeetCode problems.',
     'https://en.wikipedia.org/wiki/Graph_traversal',
     'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 7 MINUTE), NOW(), NOW()),

(9,  6, 'How to Design a URL Shortener',
     'Designing a system like bit.ly is a classic system design interview question. Key concepts: consistent hashing, Base62 encoding, Redis caching for hot URLs, and horizontal scaling with a load balancer. A must-know for software engineering roles.',
     'https://www.geeksforgeeks.org/system-design-url-shortening-service/',
     'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 8 MINUTE), NOW(), NOW()),

(10, 7, 'Post-Quantum Cryptography is Here',
     'NIST finalized its first post-quantum encryption standards to protect data from future quantum computers. Current RSA and ECC encryption will be breakable by quantum machines — these new algorithms (CRYSTALS-Kyber, CRYSTALS-Dilithium) are the solution.',
     'https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-cryptography-standards',
     'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 9 MINUTE), NOW(), NOW()),

(11, 4, 'Claude 3.5 Sonnet: Better Than GPT-4o for Coding?',
     'Anthropic released Claude 3.5 Sonnet, which many developers claim outperforms GPT-4o on complex coding tasks. It scored 64% on SWE-bench — solving real GitHub issues autonomously. This is the model powering the new Claude Artifacts feature.',
     'https://www.anthropic.com/news/claude-3-5-sonnet',
     'https://images.unsplash.com/photo-1620712943543-bcc4628c9757?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), NOW()),

(12, 11, 'How to Crack Your First Developer Internship',
     'Landing a dev internship comes down to three things: a strong GitHub profile with real projects, confidence in DSA fundamentals, and the ability to articulate your thought process. Start with open source contributions on beginner-friendly repos.',
     'https://dev.to/career',
     'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 11 MINUTE), NOW(), NOW()),

(13, 5, 'Mastering Docker Multi-Stage Builds',
     'Multi-stage builds are critical for creating lightweight, production-ready Docker images. By separating the build environment from the runtime environment, you can reduce image sizes by up to 90% and secure your containers by excluding compilers and source code.',
     'https://docs.docker.com/build/building/multi-stage/',
     'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 12 MINUTE), NOW(), NOW()),

(14, 5, 'Kubernetes GitOps with ArgoCD',
     'GitOps is standardizing how teams manage Kubernetes deployments. ArgoCD acts as a continuous delivery controller, constantly pulling Git state and reconciling it with the live cluster. This eliminates manual kubectl commands and ensures configuration consistency.',
     'https://argo-cd.readthedocs.io/en/stable/',
     'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 13 MINUTE), NOW(), NOW()),

(15, 3, 'React Native Architecture Reborn',
     'React Native''s new architecture replaces the asynchronous bridge with JSI (JavaScript Interface), enabling synchronous, direct invocation of native functions. Fabric and TurboModules provide lightning-fast UI renders and lazy native modules initialization.',
     'https://reactnative.dev/docs/the-new-architecture/landing',
     'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 14 MINUTE), NOW(), NOW()),

(16, 3, 'Jetpack Compose Dynamic Theming',
     'Jetpack Compose simplifies Android UI development through declarative programming. With Material Design 3 and dynamic theming, Compose pulls system accent colors in real time, making Android applications feel integrated and aesthetically unified with minimal code.',
     'https://developer.android.com/jetpack/compose',
     'https://images.unsplash.com/photo-1607252681355-89f5ce5e69e2?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW(), NOW()),

(17, 5, 'AWS IAM Roles for Service Accounts (IRSA) Explained',
     'Securing EKS clusters requires moving away from static AWS access keys. With IRSA, Kubernetes service accounts map to IAM roles using OpenID Connect (OIDC). This implements the principle of least privilege, providing temporary, scoped AWS tokens to pods.',
     'https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html',
     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 16 MINUTE), NOW(), NOW());

-- ── Seed News Sources ──────────────────────────────────────────────────────────
-- Seeding 23 news sources (including the 5 new highly specialized technical feeds)
INSERT IGNORE INTO news_sources (id, name, url, active, created_at, updated_at) VALUES
(1, 'Economic Times Tech (ETTech)', 'https://economictimes.indiatimes.com/tech/rssfeeds/13357204.cms', true, NOW(), NOW()),
(2, 'The Hindu Tech', 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', true, NOW(), NOW()),
(3, 'YourStory Tech (Indian Startups)', 'https://yourstory.com/category/tech/feed', true, NOW(), NOW()),
(4, 'GeeksforGeeks (India DSA/Prep)', 'https://www.geeksforgeeks.org/feed/', true, NOW(), NOW()),
(5, 'Hacker News (FAANG/System Design)', 'https://hnrss.org/frontpage', true, NOW(), NOW()),
(6, 'Dev.to (Developer Tutorials)', 'https://dev.to/feed', true, NOW(), NOW()),
(7, 'FreeCodeCamp', 'https://www.freecodecamp.org/news/rss/', true, NOW(), NOW()),
(8, 'Gadgets360 (NDTV Tech)', 'https://gadgets.ndtv.com/rss/feeds', true, NOW(), NOW()),
(9, 'InfoQ (Architecture & Cloud)', 'https://feed.infoq.com/', true, NOW(), NOW()),
(10, 'AWS Architecture Blog', 'https://aws.amazon.com/blogs/architecture/feed/', true, NOW(), NOW()),
(11, 'Android Developers Blog', 'https://android-developers.googleblog.com/feeds/posts/default', true, NOW(), NOW()),
(12, 'Kubernetes Blog (DevOps)', 'https://kubernetes.io/feed.xml', true, NOW(), NOW()),
(13, 'HackerNoon', 'https://hackernoon.com/feed', true, NOW(), NOW()),
(14, 'Towards Data Science', 'https://towardsdatascience.com/feed', true, NOW(), NOW()),
(15, 'Smashing Magazine', 'https://www.smashingmagazine.com/feed/', true, NOW(), NOW()),
(16, 'GitHub Blog', 'https://github.blog/feed/', true, NOW(), NOW()),
(17, 'The Kotlin Blog', 'https://blog.jetbrains.com/kotlin/feed/', true, NOW(), NOW()),
(18, 'Spring Blog', 'https://spring.io/blog.xml', true, NOW(), NOW()),
(19, 'TechCrunch Startups', 'https://techcrunch.com/category/startups/feed/', true, NOW(), NOW()),
(20, 'UX Collective', 'https://uxdesign.cc/feed', true, NOW(), NOW()),
(21, 'KDnuggets', 'https://www.kdnuggets.com/feed', true, NOW(), NOW()),
(22, 'CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', true, NOW(), NOW()),
(23, 'Red Hat Developer', 'https://developers.redhat.com/blog/feed', true, NOW(), NOW());

-- ── Seed Technology Events for Feed ───────────────────────────────────────────
INSERT IGNORE INTO technology_event (
    id, title, categories_json, credibility_score, importance_score, merge_confidence,
    first_seen, last_updated, lifecycle_status, major_version, minor_version, patch_version,
    version_string, entities_json, summary, technical_impact, developer_impact, enterprise_impact,
    migration_notes, breaking_changes, security_notes, official_links_json, llm_model, prompt_version,
    response_schema_version, summary_status, prompt_tokens, completion_tokens, estimated_cost_usd,
    estimated_cost_inr, generation_latency, summary_generated_at
) VALUES
('e1', 'Java 21 LTS Release Launch', '["AI & Machine Learning", "System Design & Backend"]', 98.0, 92.0, 1.0,
 NOW(), NOW(), 'RELEASED', 21, 0, 0,
 '21.0.0', '["Java", "Spring Boot"]', 'JDK 21 is a major LTS release introducing production-ready Virtual Threads (JEP 444) for lightweight concurrency and scoped values.',
 'Virtual threads scale application throughput with near-zero memory overhead compared to platform threads.',
 'Accelerates developer velocity by keeping synchronous, blocking execution flows easy to write and debug.',
 'Reduces cloud compute infrastructure costs by maximizing server CPU and resource utilization.',
 'No breaking changes. Update build tools configuration and source compatibility level settings to Java 21.',
 'Deprecated legacy thread constructor structures.',
 'Resolved 14 minor JDK CVE vulnerabilities.', '["https://openjdk.org/jeps/444"]', 'gemini-1.5-flash', 'v1', 'v1', 'NEW', 120, 240, 0.0005, 0.04, 800, NOW()),

('e2', 'React 19 Actions & React Compiler', '["Web Development"]', 96.0, 89.0, 1.0,
 NOW(), NOW(), 'RELEASED', 19, 0, 0,
 '19.0.0', '["React", "NextJS"]', 'React 19 introduces automatic re-render optimization via the new React Compiler, alongside support for server actions and form hook states.',
 'Eliminates the need for manual useMemo and useCallback optimization triggers.',
 'Simplifies form state tracking with the useActionState hook, and optimizes async transitions.',
 'Enables faster client rendering speeds and smaller client bundle payload sizes.',
 'Upgrade React and React DOM dependencies, and update custom build configurations to target the new compiler options.',
 'Removed legacy context properties and direct DOM manipulation properties inside ref attributes.',
 'No security vulnerabilities identified.', '["https://react.dev/blog/2024/04/25/react-19"]', 'gemini-1.5-flash', 'v1', 'v1', 'NEW', 130, 250, 0.0005, 0.04, 750, NOW()),

('e3', 'Kubernetes v1.30: GitOps & Security Hardening', '["Cloud & DevOps"]', 95.0, 85.0, 1.0,
 NOW(), NOW(), 'RELEASED', 1, 30, 0,
 '1.30.0', '["Kubernetes", "Docker"]', 'Kubernetes v1.30 introduces structured authorization configuration and advanced security context profiles for container execution.',
 'Hardens default sandbox container control and enables strict validation rules on admission webhooks.',
 'Provides standardized resource allocation APIs and better diagnostics reporting.',
 'Secures cloud deployments and prevents unauthorized sandbox container breakout exploits.',
 'Update cluster orchestration profiles and verify webhook validation payload shapes before scaling up nodes.',
 'Deprecated legacy authentication controllers.',
 'Addresses CVE-2026-1122 within kube-apiserver component.', '["https://kubernetes.io/blog/2024/04/17/kubernetes-v1-30-release/"]', 'gemini-1.5-flash', 'v1', 'v1', 'NEW', 140, 260, 0.0005, 0.04, 900, NOW());
