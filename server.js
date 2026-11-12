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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  console.warn('Set SESSION_SECRET and ADMIN_PASSWORD in your environment before public deployment.');
}
const db = new Database(path.join(DATA_DIR, 'horizon.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS items (
 id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, name TEXT NOT NULL,
 short_perception TEXT DEFAULT '', image TEXT DEFAULT '', description TEXT DEFAULT '',
 button_text TEXT DEFAULT '', button_url TEXT DEFAULT '', status TEXT DEFAULT 'published',
 publish_at TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS faqs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT NOT NULL, question_en TEXT NOT NULL,
 question_bn TEXT NOT NULL, answer TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, message TEXT NOT NULL,
 is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS feedback (
 id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT DEFAULT '', message TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS footer_sections (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS footer_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT, section_id INTEGER NOT NULL,
 name TEXT NOT NULL, description TEXT DEFAULT '',
 FOREIGN KEY(section_id) REFERENCES footer_sections(id) ON DELETE CASCADE
);
`);
db.pragma('foreign_keys = ON');

const initial = {
  company_intro: 'HORIZON is a technology company focused on shaping the future through innovation.\\n\\nWe explore the possibilities of Artificial Intelligence, advanced software, and intelligent digital solutions.\\n\\nOur mission is to make technology more powerful, accessible, and meaningful.\\n\\nWe believe in transforming ambitious ideas into meaningful innovations.\\n\\nWe are building today for a world of limitless possibilities.',
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
const insertContent = db.prepare('INSERT OR IGNORE INTO content(key,value) VALUES (?,?)');
for (const [k,v] of Object.entries(initial)) insertContent.run(k,v);
if (!db.prepare('SELECT id FROM admins LIMIT 1').get()) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  db.prepare('INSERT INTO admins(username,password_hash) VALUES (?,?)').run(username, bcrypt.hashSync(password, 12));
  console.warn(`Initial admin created: ${username}. Change the password/environment before deployment.`);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || 'development-only-change-me',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8*60*60*1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));
const loginLimiter = rateLimit({ windowMs: 15*60*1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb) => cb(null, UPLOAD_DIR),
    filename: (_,file,cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});
const auth = (req,res,next) => req.session.admin ? next() : res.status(401).json({ error: 'Please log in.' });

app.post('/api/login', loginLimiter, (req,res) => {
  const { username, password } = req.body || {};
  const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(username || '');
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) return res.status(401).json({ error: 'Incorrect username or password.' });
  req.session.admin = { id: admin.id, username: admin.username };
  res.json({ ok: true, username: admin.username });
});
app.post('/api/logout', auth, (req,res) => req.session.destroy(() => res.json({ ok:true })));
app.get('/api/me', (req,res) => res.json({ admin: req.session.admin || null }));
app.get('/api/site', (_,res) => {
  const content = Object.fromEntries(db.prepare('SELECT key,value FROM content').all().map(r => [r.key,r.value]));
  const items = db.prepare("SELECT * FROM items WHERE status IN ('published','coming_soon') ORDER BY id DESC").all();
  res.json({ content, items });
});
app.put('/api/content', auth, (req,res) => {
  const allowed = new Set(Object.keys(initial));
  const stmt = db.prepare('INSERT INTO content(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const tx = db.transaction(obj => Object.entries(obj || {}).forEach(([k,v]) => { if (allowed.has(k) && typeof v === 'string') stmt.run(k,v); }));
  tx(req.body); res.json({ ok:true });
});
app.post('/api/upload', auth, (req,res) => upload.single('image')(req,res,err => {
  if (err) return res.status(400).json({ error: err.message || 'Upload failed. Images must be under 5MB.' });
  if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG, WEBP or GIF image.' });
  res.json({ url: '/uploads/' + req.file.filename });
}));
app.get('/api/items', auth, (_,res) => res.json(db.prepare('SELECT * FROM items ORDER BY id DESC').all()));
app.get('/api/items/:id', (req,res) => { const item=db.prepare("SELECT * FROM items WHERE id=? AND status IN ('published','coming_soon')").get(req.params.id); if(!item)return res.status(404).json({error:'Item not found.'}); res.json(item); });
app.post('/api/items', auth, (req,res) => {
  const x=req.body||{};
  if (!x.name || !x.type) return res.status(400).json({error:'Name and content type are required.'});
  const result=db.prepare(`INSERT INTO items(type,name,short_perception,image,description,button_text,button_url,status,publish_at)
  VALUES (@type,@name,@short_perception,@image,@description,@button_text,@button_url,@status,@publish_at)`).run({
    type:x.type,name:x.name,short_perception:x.short_perception||'',image:x.image||'',description:x.description||'',
    button_text:x.button_text||'Explore',button_url:x.button_url||'',status:x.status||'draft',publish_at:x.publish_at||''
  });
  const starterQuestions = [
    ['What is this product or service?','এই প্রোডাক্ট বা সার্ভিসটি কী?'],
    ['What does it do?','এটি কী কাজ করে?'],
    ['How can I get started?','আমি কীভাবে ব্যবহার শুরু করব?'],
    ['Who is this designed for?','এটি কাদের জন্য তৈরি?'],
    ['Is it free or paid?','এটি কি ফ্রি, নাকি পেইড?'],
    ['How do I access it?','আমি কীভাবে এটি ব্যবহার করতে পারব?'],
    ['What are its main features?','এর প্রধান ফিচারগুলো কী কী?'],
    ['Does it require an account?','এটি ব্যবহার করতে কি অ্যাকাউন্ট লাগবে?'],
    ['Can I use it on mobile?','আমি কি মোবাইলে এটি ব্যবহার করতে পারব?'],
    ['Where can I learn more?','এটি সম্পর্কে আরও কোথায় জানতে পারব?'],
    ['How can I contact support?','আমি কীভাবে সাপোর্টের সঙ্গে যোগাযোগ করব?'],
    ['Is there a launch date?','এটি কবে চালু হবে?']
  ];
  const addQuestion = db.prepare('INSERT INTO faqs(item_name,question_en,question_bn,answer) VALUES (?,?,?,?)');
  starterQuestions.forEach(q => addQuestion.run(x.name,q[0],q[1],''));
  res.json({id:result.lastInsertRowid});
});
app.put('/api/items/:id', auth, (req,res) => {
  const x=req.body||{};
  db.prepare(`UPDATE items SET type=@type,name=@name,short_perception=@short_perception,image=@image,description=@description,
  button_text=@button_text,button_url=@button_url,status=@status,publish_at=@publish_at WHERE id=@id`).run({
    id:req.params.id,type:x.type,name:x.name,short_perception:x.short_perception||'',image:x.image||'',description:x.description||'',
    button_text:x.button_text||'Explore',button_url:x.button_url||'',status:x.status||'draft',publish_at:x.publish_at||''
  }); res.json({ok:true});
});
app.delete('/api/items/:id', auth, (req,res) => { db.prepare('DELETE FROM items WHERE id=?').run(req.params.id); res.json({ok:true}); });

app.get('/api/faqs', auth, (_,res)=>res.json(db.prepare('SELECT * FROM faqs ORDER BY item_name, id').all()));
app.post('/api/faqs', auth, (req,res)=>{
 const x=req.body||{}; if(!x.item_name||!x.question_en||!x.question_bn) return res.status(400).json({error:'Product name and both questions are required.'});
 const r=db.prepare('INSERT INTO faqs(item_name,question_en,question_bn,answer) VALUES (?,?,?,?)').run(x.item_name,x.question_en,x.question_bn,x.answer||'');
 res.json({id:r.lastInsertRowid});
});
app.put('/api/faqs/:id', auth, (req,res)=>{const x=req.body||{};db.prepare('UPDATE faqs SET item_name=?,question_en=?,question_bn=?,answer=? WHERE id=?').run(x.item_name,x.question_en,x.question_bn,x.answer||'',req.params.id);res.json({ok:true});});
app.delete('/api/faqs/:id', auth, (req,res)=>{db.prepare('DELETE FROM faqs WHERE id=?').run(req.params.id);res.json({ok:true});});
app.get('/api/help', (_,res)=>res.json(db.prepare('SELECT item_name,question_en,question_bn,answer FROM faqs ORDER BY item_name,id').all()));
app.post('/api/messages', (req,res)=>{const x=req.body||{};if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(x.email||'')||!x.message)return res.status(400).json({error:'Enter a valid email and message.'});db.prepare('INSERT INTO messages(email,message) VALUES (?,?)').run(x.email,x.message);res.json({ok:true});});
app.post('/api/feedback', (req,res)=>{const x=req.body||{};if(!x.message)return res.status(400).json({error:'Write your feedback first.'});db.prepare('INSERT INTO feedback(email,message) VALUES (?,?)').run(x.email||'',x.message);res.json({ok:true});});
app.get('/api/messages',auth,(req,res)=>{const mode=req.query.mode||'all';const where=mode==='read'?'WHERE is_read=1':mode==='unread'?'WHERE is_read=0':'';res.json(db.prepare(`SELECT * FROM messages ${where} ORDER BY id DESC`).all());});
app.patch('/api/messages/:id',auth,(req,res)=>{db.prepare('UPDATE messages SET is_read=? WHERE id=?').run(req.body.is_read?1:0,req.params.id);res.json({ok:true});});
app.get('/api/feedback',auth,(_,res)=>res.json(db.prepare('SELECT * FROM feedback ORDER BY id DESC').all()));
app.get('/api/footer',(_,res)=>res.json({sections:db.prepare('SELECT * FROM footer_sections ORDER BY id').all(),items:db.prepare('SELECT * FROM footer_items ORDER BY id').all()}));
app.get('/api/footer/manage',auth,(_,res)=>res.json({sections:db.prepare('SELECT * FROM footer_sections ORDER BY id').all(),items:db.prepare('SELECT * FROM footer_items ORDER BY id').all()}));
app.post('/api/footer/sections',auth,(req,res)=>{const r=db.prepare('INSERT INTO footer_sections(title) VALUES (?)').run(req.body.title);res.json({id:r.lastInsertRowid});});
app.put('/api/footer/sections/:id',auth,(req,res)=>{db.prepare('UPDATE footer_sections SET title=? WHERE id=?').run(req.body.title,req.params.id);res.json({ok:true});});
app.delete('/api/footer/sections/:id',auth,(req,res)=>{db.prepare('DELETE FROM footer_items WHERE section_id=?').run(req.params.id);db.prepare('DELETE FROM footer_sections WHERE id=?').run(req.params.id);res.json({ok:true});});
app.post('/api/footer/items',auth,(req,res)=>{const x=req.body;const r=db.prepare('INSERT INTO footer_items(section_id,name,description) VALUES (?,?,?)').run(x.section_id,x.name,x.description||'');res.json({id:r.lastInsertRowid});});
app.put('/api/footer/items/:id',auth,(req,res)=>{const x=req.body;db.prepare('UPDATE footer_items SET name=?,description=? WHERE id=?').run(x.name,x.description||'',req.params.id);res.json({ok:true});});
app.delete('/api/footer/items/:id',auth,(req,res)=>{db.prepare('DELETE FROM footer_items WHERE id=?').run(req.params.id);res.json({ok:true});});

app.get('/admin',(_,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('*',(_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`HORIZON running at http://localhost:${PORT}`));
