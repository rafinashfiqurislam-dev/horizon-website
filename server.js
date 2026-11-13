
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Production must never start with placeholder credentials.
if (IS_PRODUCTION) {
  if (!process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET.length < 32 ||
      !process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD === 'change-this-immediately') {
    throw new Error(
      'Production requires a strong SESSION_SECRET and ADMIN_PASSWORD.'
    );
  }
}

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex');

if (!process.env.SESSION_SECRET) {
  console.warn('Development session secret generated for this run.');
}

if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// DATABASE
const db = new Database(path.join(DATA_DIR, 'horizon.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
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
`);

// INITIAL WEBSITE CONTENT
const initial = {
  company_intro:
    'HORIZON is a technology company focused on shaping the future through innovation.\n\nWe explore the possibilities of Artificial Intelligence, advanced software, and intelligent digital solutions.\n\nOur mission is to make technology more powerful, accessible, and meaningful.\n\nWe believe in transforming ambitious ideas into meaningful innovations.\n\nWe are building today for a world of limitless possibilities.',
  tagline: 'Think beyond',
  mission_heading: 'Our mission',
  mission_short: 'Technology with purpose. Innovation without limits.',
  mission_description: 'Add your mission details from Website Manager.',
  vision_heading: 'Our vision',
  vision_short: 'A future shaped by meaningful innovation.',
  vision_description: 'Add your vision details from Website Manager.',
  support_line: 'We are here to help you move forward.',
  hero_image: '',
  support_image: ''
};

const insertContent = db.prepare(
  'INSERT OR IGNORE INTO content(key,value) VALUES (?,?)'
);

for (const [key, value] of Object.entries(initial)) {
  insertContent.run(key, value);
}

// INITIAL ADMIN
const adminExists = db.prepare(
  'SELECT id FROM admins LIMIT 1'
).get();

if (!adminExists) {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error(
      'Set ADMIN_PASSWORD in your .env file before the first server start.'
    );
  }

  if (Buffer.byteLength(process.env.ADMIN_PASSWORD, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must not exceed 72 UTF-8 bytes.');
  }

  const username = process.env.ADMIN_USERNAME || 'admin';

  db.prepare(
    'INSERT INTO admins(username,password_hash) VALUES (?,?)'
  ).run(
    username,
    bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12)
  );

  console.log('Initial admin account created.');
}

// SECURITY MIDDLEWARE
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({
  extended: true,
  limit: '100kb'
}));

// SESSION
const sessionCookieName = 'horizon.sid';

app.use(session({
  name: sessionCookieName,
  store: new SQLiteStore({
    db: 'sessions.sqlite',
    dir: DATA_DIR,
    concurrentDB: true
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// RATE LIMITERS
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please try again later.' }
});

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions. Please try again later.' }
});

// STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// AUTHENTICATION
function auth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }

  return res.status(401).json({
    error: 'Please log in.'
  });
}

// HELPERS
function textValue(value, maxLength = 5000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function validEmail(value) {
  return typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validImageUrl(value) {
  if (!value) return true;

  if (typeof value !== 'string' || value.length > 1000) {
    return false;
  }

  return value.startsWith('/uploads/') ||
    value.startsWith('https://') ||
    value.startsWith('http://');
}

function validButtonUrl(value) {
  if (!value) return true;

  if (typeof value !== 'string' || value.length > 2000) {
    return false;
  }

  if (value.startsWith('/') && !value.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ||
      parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function itemValues(x = {}) {
  return {
    type: textValue(x.type, 100),
    name: textValue(x.name, 200),
    short_perception: textValue(x.short_perception, 500),
    image: textValue(x.image, 1000),
    description: textValue(x.description, 10000),
    button_text: textValue(x.button_text, 100),
    button_url: textValue(x.button_url, 2000),
    status: ['draft', 'published', 'coming_soon'].includes(x.status)
      ? x.status
      : 'draft',
    publish_at: textValue(x.publish_at, 100)
  };
}

// IMAGE UPLOAD
// Files are checked by their actual file signature, not MIME type alone.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

function detectImage(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }

  // PNG
  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return 'png';
  }

  // GIF
  const gifHeader = buffer.subarray(0, 6).toString('ascii');

  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'gif';
  }

  // WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

// LOGIN
app.post('/api/login', loginLimiter, (req, res, next) => {
  try {
    const username = textValue(req.body?.username, 100);
    const password = req.body?.password;

    if (typeof password !== 'string' || password.length > 72) {
      return res.status(400).json({
        error: 'Invalid login details.'
      });
    }

    const admin = db.prepare(
      'SELECT * FROM admins WHERE username=?'
    ).get(username);

    if (
      !admin ||
      !bcrypt.compareSync(password, admin.password_hash)
    ) {
      return res.status(401).json({
        error: 'Incorrect username or password.'
      });
    }

    // Regenerate session after login.
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.admin = {
        id: admin.id,
        username: admin.username
      };

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        res.json({
          ok: true,
          username: admin.username
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// LOGOUT
app.post('/api/logout', auth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Could not log out.'
      });
    }

    res.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION
    });

    res.json({ ok: true });
  });
});

// CURRENT ADMIN
app.get('/api/me', (req, res) => {
  res.json({
    admin: req.session.admin || null
  });
});

// PUBLIC WEBSITE CONTENT
app.get('/api/site', (req, res) => {
  const content = Object.fromEntries(
    db.prepare('SELECT key,value FROM content')
      .all()
      .map(row => [row.key, row.value])
  );

  const items = db.prepare(
    "SELECT * FROM items WHERE status IN ('published','coming_soon') ORDER BY id DESC"
  ).all();

  res.json({ content, items });
});

// UPDATE WEBSITE CONTENT
app.put('/api/content', auth, (req, res) => {
  const allowed = new Set(Object.keys(initial));

  const stmt = db.prepare(`
    INSERT INTO content(key,value)
    VALUES (?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `);

  const entries = Object.entries(req.body || {});

  if (entries.length > 100) {
    return res.status(400).json({
      error: 'Too many content fields.'
    });
  }

  const tx = db.transaction((data) => {
    for (const [key, value] of data) {
      if (allowed.has(key) && typeof value === 'string') {
        stmt.run(key, value.slice(0, 20000));
      }
    }
  });

  tx(entries);

  res.json({ ok: true });
});

// IMAGE UPLOAD
app.post('/api/upload', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: 'Upload failed. Images must be under 5MB.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Choose a JPG, PNG, WEBP or GIF image.'
      });
    }

    const extension = detectImage(req.file.buffer);

    if (!extension) {
      return res.status(400).json({
        error: 'The uploaded file is not a supported image.'
      });
    }

    const filename =
      Date.now() + '-' + crypto.randomBytes(8).toString('hex') +
      '.' + extension;

    try {
      fs.writeFileSync(
        path.join(UPLOAD_DIR, filename),
        req.file.buffer,
        { flag: 'wx' }
      );

      res.json({
        url: '/uploads/' + filename
      });
    } catch (error) {
      next(error);
    }
  });
});

// ITEMS
app.get('/api/items', auth, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM items ORDER BY id DESC').all()
  );
});

app.get('/api/items/:id', (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid item ID.' });
  }

  const item = db.prepare(
    "SELECT * FROM items WHERE id=? AND status IN ('published','coming_soon')"
  ).get(Number(req.params.id));

  if (!item) {
    return res.status(404).json({
      error: 'Item not found.'
    });
  }

  res.json(item);
});

app.post('/api/items', auth, (req, res) => {
  const x = itemValues(req.body);

  if (!x.name || !x.type) {
    return res.status(400).json({
      error: 'Name and content type are required.'
    });
  }

  if (!validImageUrl(x.image) || !validButtonUrl(x.button_url)) {
    return res.status(400).json({
      error: 'Invalid image or button URL.'
    });
  }

  const result = db.prepare(`
    INSERT INTO items(
      type,name,short_perception,image,description,
      button_text,button_url,status,publish_at
    )
    VALUES (
      @type,@name,@short_perception,@image,@description,
      @button_text,@button_url,@status,@publish_at
    )
  `).run(x);

  const starterQuestions = [
    ['What is this product or service?', 'এই প্রোডাক্ট বা সার্ভিসটি কী?'],
    ['What does it do?', 'এটি কী কাজ করে?'],
    ['How can I get started?', 'আমি কীভাবে ব্যবহার শুরু করব?'],
    ['Who is this designed for?', 'এটি কাদের জন্য তৈরি?'],
    ['Is it free or paid?', 'এটি কি ফ্রি, নাকি পেইড?'],
    ['How do I access it?', 'আমি কীভাবে এটি ব্যবহার করতে পারব?'],
    ['What are its main features?', 'এর প্রধান ফিচারগুলো কী কী?'],
    ['Does it require an account?', 'এটি ব্যবহার করতে কি অ্যাকাউন্ট লাগবে?'],
    ['Can I use it on mobile?', 'আমি কি মোবাইলে এটি ব্যবহার করতে পারব?'],
    ['Where can I learn more?', 'এটি সম্পর্কে আরও কোথায় জানতে পারব?'],
    ['How can I contact support?', 'আমি কীভাবে সাপোর্টের সঙ্গে যোগাযোগ করব?'],
    ['Is there a launch date?', 'এটি কবে চালু হবে?']
  ];

  const addQuestion = db.prepare(`
    INSERT INTO faqs(item_name,question_en,question_bn,answer)
    VALUES (?,?,?,?)
  `);

  const addAll = db.transaction(() => {
    for (const question of starterQuestions) {
      addQuestion.run(x.name, question[0], question[1], '');
    }
  });

  addAll();

  res.json({
    id: result.lastInsertRowid
  });
});

app.put('/api/items/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid item ID.' });
  }

  const x = itemValues(req.body);

  if (!x.name || !x.type) {
    return res.status(400).json({
      error: 'Name and content type are required.'
    });
  }

  if (!validImageUrl(x.image) || !validButtonUrl(x.button_url)) {
    return res.status(400).json({
      error: 'Invalid image or button URL.'
    });
  }

  db.prepare(`
    UPDATE items SET
      type=@type,
      name=@name,
      short_perception=@short_perception,
      image=@image,
      description=@description,
      button_text=@button_text,
      button_url=@button_url,
      status=@status,
      publish_at=@publish_at
    WHERE id=@id
  `).run({
    ...x,
    id: Number(req.params.id)
  });

  res.json({ ok: true });
});

app.delete('/api/items/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid item ID.' });
  }

  db.prepare('DELETE FROM items WHERE id=?')
    .run(Number(req.params.id));

  res.json({ ok: true });
});

// FAQ
app.get('/api/faqs', auth, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM faqs ORDER BY item_name,id').all()
  );
});

app.post('/api/faqs', auth, (req, res) => {
  const x = req.body || {};

  const itemName = textValue(x.item_name, 200);
  const questionEn = textValue(x.question_en, 1000);
  const questionBn = textValue(x.question_bn, 1000);
  const answer = textValue(x.answer, 5000);

  if (!itemName || !questionEn || !questionBn) {
    return res.status(400).json({
      error: 'Product name and both questions are required.'
    });
  }

  const result = db.prepare(`
    INSERT INTO faqs(item_name,question_en,question_bn,answer)
    VALUES (?,?,?,?)
  `).run(itemName, questionEn, questionBn, answer);

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/faqs/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid FAQ ID.' });
  }

  const x = req.body || {};

  db.prepare(`
    UPDATE faqs
    SET item_name=?,question_en=?,question_bn=?,answer=?
    WHERE id=?
  `).run(
    textValue(x.item_name, 200),
    textValue(x.question_en, 1000),
    textValue(x.question_bn, 1000),
    textValue(x.answer, 5000),
    Number(req.params.id)
  );

  res.json({ ok: true });
});

app.delete('/api/faqs/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid FAQ ID.' });
  }

  db.prepare('DELETE FROM faqs WHERE id=?')
    .run(Number(req.params.id));

  res.json({ ok: true });
});

app.get('/api/help', (req, res) => {
  res.json(
    db.prepare(`
      SELECT item_name,question_en,question_bn,answer
      FROM faqs
      ORDER BY item_name,id
    `).all()
  );
});

// SUPPORT MESSAGES
app.post('/api/messages', messageLimiter, (req, res) => {
  const x = req.body || {};

  const email = textValue(x.email, 254);
  const message = textValue(x.message, 5000);

  if (!validEmail(email) || !message) {
    return res.status(400).json({
      error: 'Enter a valid email and message.'
    });
  }

  db.prepare(
    'INSERT INTO messages(email,message) VALUES (?,?)'
  ).run(email, message);

  res.json({ ok: true });
});

app.get('/api/messages', auth, (req, res) => {
  const mode = req.query.mode || 'all';

  const where =
    mode === 'read' ? 'WHERE is_read=1' :
    mode === 'unread' ? 'WHERE is_read=0' : '';

  res.json(
    db.prepare(
      `SELECT * FROM messages ${where} ORDER BY id DESC`
    ).all()
  );
});

app.patch('/api/messages/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid message ID.' });
  }

  db.prepare(
    'UPDATE messages SET is_read=? WHERE id=?'
  ).run(
    req.body?.is_read ? 1 : 0,
    Number(req.params.id)
  );

  res.json({ ok: true });
});

// FEEDBACK
app.post('/api/feedback', feedbackLimiter, (req, res) => {
  const x = req.body || {};

  const email = textValue(x.email, 254);
  const message = textValue(x.message, 5000);

  if (!message) {
    return res.status(400).json({
      error: 'Write your feedback first.'
    });
  }

  if (email && !validEmail(email)) {
    return res.status(400).json({
      error: 'Enter a valid email address.'
    });
  }

  db.prepare(
    'INSERT INTO feedback(email,message) VALUES (?,?)'
  ).run(email, message);

  res.json({ ok: true });
});

app.get('/api/feedback', auth, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM feedback ORDER BY id DESC').all()
  );
});

// FOOTER
app.get('/api/footer', (req, res) => {
  res.json({
    sections: db.prepare(
      'SELECT * FROM footer_sections ORDER BY id'
    ).all(),

    items: db.prepare(
      'SELECT * FROM footer_items ORDER BY id'
    ).all()
  });
});

app.get('/api/footer/manage', auth, (req, res) => {
  res.json({
    sections: db.prepare(
      'SELECT * FROM footer_sections ORDER BY id'
    ).all(),

    items: db.prepare(
      'SELECT * FROM footer_items ORDER BY id'
    ).all()
  });
});

app.post('/api/footer/sections', auth, (req, res) => {
  const title = textValue(req.body?.title, 200);

  if (!title) {
    return res.status(400).json({
      error: 'Section title is required.'
    });
  }

  const result = db.prepare(
    'INSERT INTO footer_sections(title) VALUES (?)'
  ).run(title);

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/footer/sections/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid section ID.' });
  }

  const title = textValue(req.body?.title, 200);

  if (!title) {
    return res.status(400).json({
      error: 'Section title is required.'
    });
  }

  db.prepare(
    'UPDATE footer_sections SET title=? WHERE id=?'
  ).run(title, Number(req.params.id));

  res.json({ ok: true });
});

app.delete('/api/footer/sections/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid section ID.' });
  }

  const id = Number(req.params.id);

  const removeSection = db.transaction(() => {
    db.prepare(
      'DELETE FROM footer_items WHERE section_id=?'
    ).run(id);

    db.prepare(
      'DELETE FROM footer_sections WHERE id=?'
    ).run(id);
  });

  removeSection();

  res.json({ ok: true });
});

app.post('/api/footer/items', auth, (req, res) => {
  const x = req.body || {};

  const sectionId = Number(x.section_id);
  const name = textValue(x.name, 200);
  const description = textValue(x.description, 1000);

  if (!validId(sectionId) || !name) {
    return res.status(400).json({
      error: 'A valid section and item name are required.'
    });
  }

  const result = db.prepare(`
    INSERT INTO footer_items(section_id,name,description)
    VALUES (?,?,?)
  `).run(sectionId, name, description);

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/footer/items/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid footer item ID.' });
  }

  const x = req.body || {};
  const name = textValue(x.name, 200);

  if (!name) {
    return res.status(400).json({
      error: 'Item name is required.'
    });
  }

  db.prepare(`
    UPDATE footer_items
    SET name=?,description=?
    WHERE id=?
  `).run(
    name,
    textValue(x.description, 1000),
    Number(req.params.id)
  );

  res.json({ ok: true });
});

app.delete('/api/footer/items/:id', auth, (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid footer item ID.' });
  }

  db.prepare('DELETE FROM footer_items WHERE id=?')
    .run(Number(req.params.id));

  res.json({ ok: true });
});

// ADMIN PAGE
app.get('/admin', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'admin.html')
  );
});

// HOME PAGE FALLBACK
app.get('*', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'An unexpected server error occurred.'
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`HORIZON running on port ${PORT}`);
});
