
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  short_perception TEXT DEFAULT '',
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  button_text TEXT DEFAULT '',
  button_url TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  publish_at TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  question_en TEXT NOT NULL,
  question_bn TEXT NOT NULL,
  answer TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT DEFAULT '',
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS footer_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS footer_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  FOREIGN KEY(section_id)
    REFERENCES footer_sections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_status
ON items(status, id DESC);

CREATE INDEX IF NOT EXISTS idx_faqs_item
ON faqs(item_name);

CREATE INDEX IF NOT EXISTS idx_messages_read
ON messages(is_read, id DESC);

CREATE INDEX IF NOT EXISTS idx_footer_section
ON footer_items(section_id);

INSERT OR IGNORE INTO content(key, value) VALUES
('company_intro', 'HORIZON is a technology company focused on shaping the future through innovation.

We explore the possibilities of Artificial Intelligence, advanced software, and intelligent digital solutions.

Our mission is to make technology more powerful, accessible, and meaningful.

We believe in transforming ambitious ideas into meaningful innovations.

We are building today for a world of limitless possibilities.'),
('tagline', 'Think beyond'),
('mission_heading', 'Our mission'),
('mission_short', 'Technology with purpose. Innovation without limits.'),
('mission_description', 'Add your mission details from Website Manager.'),
('vision_heading', 'Our vision'),
('vision_short', 'A future shaped by meaningful innovation.'),
('vision_description', 'Add your vision details from Website Manager.'),
('support_line', 'We are here to help you move forward.'),
('hero_image', ''),
('support_image', '');
