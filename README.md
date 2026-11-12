# HORIZON Corporate Website

A starter full-stack corporate website and admin content manager built with Node.js, Express and SQLite.

## Features
- Responsive HORIZON landing page with parallax-style hero image, company introduction and tagline.
- Dynamic Mission and Vision content, including detail modal.
- Product/service cards with image, short perception, CTA, publish/draft/coming-soon state and optional publish date.
- Support page with FAQ search, contact form and feedback form.
- Admin manager for home content, products/services, bilingual FAQ entries, message inbox (read/unread/all), feedback and footer sections/items.
- SQLite database, password-hashed admin account, session login, login rate limit, upload size/type limits.

## Requirements
- Node.js 20+
- npm

## Run locally
1. Extract the ZIP.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`.
4. Change `SESSION_SECRET` and `ADMIN_PASSWORD` in `.env`.
5. Run `npm start`.
6. Open `http://localhost:3000` for the public website.
7. Open `http://localhost:3000/admin` for Website Manager.

Default development login (only if you did not configure `.env`):
- Username: `admin`
- Password: `ChangeMe123!`

**Change the default password before deployment.** The server creates the first admin account on first database initialization. If you change the environment password after the database has already been created, it will not automatically replace the existing admin password.

## Deploying
GitHub stores the source code; it does not run this Node.js backend. Deploy the project to a Node.js hosting provider that supports persistent storage (for SQLite and uploaded images), set the environment variables from `.env.example`, and attach a persistent disk/volume mounted to the project `data/` and `public/uploads/` directories. Use HTTPS and `NODE_ENV=production`.

If your host uses ephemeral filesystems, SQLite data and uploads may be lost on redeploy/restart. For production scale, migrate SQLite to managed PostgreSQL and image uploads to object storage.

## Important scope notes
- This is a working first release/starter, not a fully audited enterprise CMS.
- The FAQ manager stores English/Bangla questions and administrator-written answers. The public support page currently displays matching questions; it does not generate AI answers or use an AI service.
- Product/service cards link to the URL you provide. A dedicated rich product detail page and product-specific image gallery can be added as a next iteration.
- The manager image upload returns a path. Copy that path into the relevant image field and save.
- Change the admin password and session secret before exposing the manager publicly.

## Project structure
```text
horizon-website/
  server.js
  package.json
  .env.example
  public/
    index.html
    style.css
    app.js
    support.html
    admin.html
    admin.css
    admin.js
    uploads/
  data/                 # created at runtime; keep persistent
```
