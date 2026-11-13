
# HORIZON — Think Beyond

HORIZON is a technology company focused on building innovative digital products and software solutions for the future.

Our vision is to contribute to technological progress through creativity, innovation, and meaningful digital experiences.

## Features

- Responsive corporate website.
- Modern homepage with a parallax-style hero section.
- Company introduction, Mission, and Vision sections.
- Dynamic product and service cards.
- Individual product detail pages.
- Dedicated Support page.
- FAQ section with search functionality.
- Contact message and feedback forms.
- Admin Website Manager.
- Product and service management.
- FAQ management in English and Bangla.
- Message inbox and feedback management.
- Footer content management.
- Image upload functionality.
- SQLite database.
- Admin authentication and session management.

## Technology Stack

- Node.js
- Express.js
- SQLite
- HTML5
- CSS3
- JavaScript

## Project Structure

```text
horizon-website/
│
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
│
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── item.html
    ├── support.html
    ├── admin.html
    ├── admin.css
    ├── admin.js
    │
    └── uploads/
        └── .gitkeep
```

The `data/` directory is created automatically when the application starts.

## Requirements

- Node.js 20 or later
- npm

## Local Installation

1. Download or clone this repository.
2. Open the project directory in a terminal.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` and create a file named `.env`.
5. Configure your own secure environment variables in `.env`.
6. Start the application:

   ```bash
   npm start
   ```

7. Open the website:

   `http://localhost:3000`

8. Open the Website Manager:

   `http://localhost:3000/admin`

## Environment Variables

Configure the following variables in your `.env` file:

```env
PORT=3000
SESSION_SECRET=your-unique-long-random-secret
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-admin-password
```

Never upload `.env` to GitHub or share your private credentials.

## Deployment

GitHub stores the source code but does not run the Node.js backend.

To deploy HORIZON:

- Use a hosting provider that supports Node.js applications.
- Configure the environment variables securely.
- Enable HTTPS.
- Set `NODE_ENV=production`.
- Configure persistent storage for the SQLite database and uploaded images.

The `data/` and `public/uploads/` directories must retain their contents across application restarts and redeployments.

For larger production deployments, consider migrating SQLite to PostgreSQL and image uploads to dedicated object storage.

## Important Notes

- This project is an initial working release and has not been presented as a fully audited enterprise system.
- The Support FAQ displays administrator-managed questions and answers. It does not currently generate AI responses.
- Product and service cards use the URLs configured by the administrator.
- Product detail pages use `item.html`.
- Uploaded images must be saved using the paths returned by the upload system.
- Configure secure admin credentials and a unique session secret before deployment.

## Security

- Never commit `.env`.
- Never publish passwords, API keys, or private credentials.
- Use a strong, unique admin password.
- Keep dependencies updated.
- Use HTTPS in production.

## Project Vision

**HORIZON — Think Beyond.**

Building ideas into meaningful digital experiences and exploring what technology can make possible.
Cloudflare deployment update.
