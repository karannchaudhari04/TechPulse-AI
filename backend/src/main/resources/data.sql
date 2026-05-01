-- ============================================================
-- data.sql — Seed Data
-- Runs on startup when SQL_INIT_MODE=always (local dev)
-- Set SQL_INIT_MODE=never in Render after first deploy
-- ============================================================

-- Seed ALL categories that Gemini AI uses for classification
-- (names must EXACTLY match what NewsIngestionService sends to the DB)
INSERT IGNORE INTO categories (id, name, description, created_at) VALUES
(1, 'Data Structures',      'Master the fundamentals of DSA for interviews',          NOW()),
(2, 'Artificial Intelligence', 'Latest breakthroughs in LLMs and Neural Networks',   NOW()),
(3, 'Web Development',      'Modern frameworks and frontend/backend tips',             NOW()),
(4, 'Hardware & Chips',     'CPUs, GPUs, and the future of compute',                  NOW()),
(5, 'Cybersecurity',        'Stay safe in the digital world',                         NOW()),
(6, 'System Design',        'Scalability, architecture, and distributed systems',     NOW()),
(7, 'Open Source',          'Community-driven projects and contributions',            NOW()),
(8, 'Career Tips',          'Placement prep, resume tips, and interview strategies',  NOW());

-- ── Seed Sample Bites ─────────────────────────────────────────────────────────
-- INSERT IGNORE prevents duplicate errors if app restarts
INSERT IGNORE INTO bites (id, category_id, title, content_summary, original_source_url, thumbnail_url, status, published_at, created_at, updated_at) VALUES
(1,  1, 'Understanding Big O Notation',
     'Mastering O(1), O(n), and O(log n) is the first step toward passing technical interviews at top firms. Big O describes how your algorithm scales — the difference between a solution that handles 10 inputs and one that handles 10 million.',
     'https://en.wikipedia.org/wiki/Big_O_notation',
     'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
     'PUBLISHED', NOW(), NOW(), NOW()),

(2,  2, 'The Rise of Gemini 1.5 Pro',
     'Gemini 1.5 Pro features a massive 2 million token context window, changing how we build AI-native apps. Developers can now feed entire codebases to the model and ask questions across them — a game changer for tooling.',
     'https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/',
     'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 1 MINUTE), NOW(), NOW()),

(3,  3, 'React 19: What is New?',
     'React 19 introduces Actions and improved Server Components, making apps faster and lighter. The new "use" hook simplifies async data fetching, and the compiler optimizes re-renders automatically — meaning less manual useMemo and useCallback.',
     'https://react.dev/blog/2024/04/25/react-19',
     'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 2 MINUTE), NOW(), NOW()),

(4,  4, 'Apple M4: Built for AI',
     'Apple''s M4 chip features the fastest Neural Engine ever, capable of 38 trillion operations per second. This is a powerhouse for on-device AI — running large language models locally without needing cloud connectivity.',
     'https://www.apple.com/newsroom/2024/05/apple-introduces-m4-chip/',
     'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 3 MINUTE), NOW(), NOW()),

(5,  2, 'OpenAI GPT-4o: The Omni Model',
     'OpenAI revealed GPT-4o, a model that reasons across audio, vision, and text in real time — and it''s free for all users. Response times are twice as fast as GPT-4 Turbo, bringing voice assistant capabilities to a whole new level.',
     'https://openai.com/index/hello-gpt-4o/',
     'https://images.unsplash.com/photo-1684423341311-667744213601?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 4 MINUTE), NOW(), NOW()),

(6,  4, 'NVIDIA Hits $2 Trillion Market Cap',
     'NVIDIA is now a $2 trillion company, driven by insatiable demand for AI-accelerating H100 GPUs. Every major AI lab — OpenAI, Google DeepMind, Meta AI — depends on NVIDIA hardware. For CS students, GPU programming is becoming a critical skill.',
     'https://www.nvidia.com/en-us/about-nvidia/',
     'https://images.unsplash.com/photo-1591405351990-4726e33df58d?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()),

(7,  5, 'The XZ Utils SSH Backdoor Scandal',
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

(10, 5, 'Post-Quantum Cryptography is Here',
     'NIST finalized its first post-quantum encryption standards to protect data from future quantum computers. Current RSA and ECC encryption will be breakable by quantum machines — these new algorithms (CRYSTALS-Kyber, CRYSTALS-Dilithium) are the solution.',
     'https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-cryptography-standards',
     'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 9 MINUTE), NOW(), NOW()),

(11, 2, 'Claude 3.5 Sonnet: Better Than GPT-4o for Coding?',
     'Anthropic released Claude 3.5 Sonnet, which many developers claim outperforms GPT-4o on complex coding tasks. It scored 64% on SWE-bench — solving real GitHub issues autonomously. This is the model powering the new Claude Artifacts feature.',
     'https://www.anthropic.com/news/claude-3-5-sonnet',
     'https://images.unsplash.com/photo-1620712943543-bcc4628c9757?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), NOW()),

(12, 8, 'How to Crack Your First Developer Internship',
     'Landing a dev internship comes down to three things: a strong GitHub profile with real projects, confidence in DSA fundamentals, and the ability to articulate your thought process. Start with open source contributions on beginner-friendly repos.',
     'https://dev.to/career',
     'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
     'PUBLISHED', DATE_ADD(NOW(), INTERVAL 11 MINUTE), NOW(), NOW());
-- ── Seed News Sources ──────────────────────────────────────────────────────────
INSERT IGNORE INTO news_sources (id, name, url, active, created_at, updated_at) VALUES
(1, 'TechCrunch',      'https://techcrunch.com/feed/', true, NOW(), NOW()),
(2, 'The Verge',       'https://www.theverge.com/rss/index.xml', true, NOW(), NOW()),
(3, 'Dev.to',          'https://dev.to/feed', true, NOW(), NOW()),
(4, 'Hacker News',     'https://news.ycombinator.com/rss', true, NOW(), NOW()),
(5, 'FreeCodeCamp',    'https://www.freecodecamp.org/news/rss/', true, NOW(), NOW()),
(6, 'GeeksforGeeks',   'https://www.geeksforgeeks.org/feed/', true, NOW(), NOW()),
(7, 'MIT Tech Review', 'https://www.technologyreview.com/feed/', true, NOW(), NOW());
