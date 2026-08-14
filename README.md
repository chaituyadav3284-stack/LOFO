# LOFO - Campus Lost & Found Web Portal

LOFO is a clean, minimal, and secure Lost & Found web portal developed for college final year projects. It is built on a **Node.js + Express.js** backend, rendering dynamic **EJS** template pages on the server and using a **MySQL** database.

---

## ðŸ› ï¸ Technology Stack
* **Frontend**: HTML5, CSS3, Vanilla JavaScript (responsive grids, CSS sibling selectors for menus)
* **Backend**: Node.js, Express.js
* **Database**: MySQL (promise-based connection pooling)
* **Image Hosting**: Cloudinary (production) / Local file system (`public/uploads`) fallback
* **Authentication**: Express Session & bcrypt password hashing
* **Deployment**: Pre-configured for **Vercel** serverless hosting

---

## ðŸš€ Key Features

1. **User Sign Up & Log In**: Student registration with input validation and password hashing.
2. **Dynamic Listing Categories**: Browse items sorted by category, status (lost/found), and location keywords.
3. **Admin Dashboard Statistics**: Administrative panel allowing approval of new reports and deletion of fake/spam listings.
4. **Auto-Match AI Finder**: On submission, a modular text-similarity and RGB color signature check evaluates description and color distances, instantly displaying the top 3 similar opposite listings.
5. **Session Lock Security**: Contact details (email and phone number) are hidden and login-gated to protect student privacy.

---

## ðŸ“ Project Structure

```text
lofo/
â”‚â”€â”€ api/
â”‚   â””â”€â”€ index.js             # Vercel Serverless Entrypoint (wraps express app)
â”‚â”€â”€ config/
â”‚   â”œâ”€â”€ db.js                # MySQL Database connection pool setup
â”‚   â””â”€â”€ cloudinary.js        # Cloudinary configurations
â”‚â”€â”€ controllers/
â”‚   â”œâ”€â”€ authController.js    # Login, registration, profile management
â”‚   â”œâ”€â”€ itemController.js    # Form submissions, listings search, matching
â”‚   â””â”€â”€ adminController.js   # Review approval queue, users statistics
â”‚â”€â”€ database/
â”‚   â””â”€â”€ schema.sql           # Database schema setup queries
â”‚â”€â”€ middleware/
â”‚   â”œâ”€â”€ auth.js              # Protects user & admin routes, passes sessions
â”‚   â””â”€â”€ upload.js            # Multer file upload filters
â”‚â”€â”€ public/
â”‚   â””â”€â”€ css/
â”‚       â””â”€â”€ style.css        # Clean, minimal CSS3 rules
â”‚â”€â”€ routes/
â”‚   â”œâ”€â”€ index.js             # Static landing routes
â”‚   â”œâ”€â”€ auth.js              # Auth & dashboard routes
â”‚   â”œâ”€â”€ items.js             # Listings and details routes
â”‚   â””â”€â”€ admin.js             # Administrative panel routes
â”‚â”€â”€ services/
â”‚   â””â”€â”€ similarity.js        # Modular color-sampling matching engine (AI)
â”‚â”€â”€ views/
â”‚   â””â”€â”€ ...                  # EJS view layouts and screens
â”‚â”€â”€ .env.example             # Configuration variables template
â”‚â”€â”€ package.json             # App scripts and dependencies
â””â”€â”€ vercel.json              # Vercel deployment configurations
```

---

## ðŸ“¦ Local Installation Guide

### Step 1: Install Dependencies
Open your project terminal and run:
```bash
npm install
```

### Step 2: Database Setup
1. Open your MySQL client (e.g. phpMyAdmin or MySQL CLI).
2. Create a new database named `lofo_db`.
3. Import the database structure by running the SQL queries in [`database/schema.sql`](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/lofo/database/schema.sql).

### Step 3: Configure Environment
1. Rename `.env.example` to `.env`.
2. Open `.env` and fill out your local MySQL credentials:
   ```env
   PORT=8000
   SESSION_SECRET=your_custom_secret_key
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=lofo_db
   ```

### Step 4: Run Server
Start the local development server:
```bash
npm start
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## ðŸ”’ Administrative Log In
* **Default Username**: `admin`
* **Default Password**: `admin123`

---

## ðŸŒ©ï¸ Cloudinary Deployment (Production-Ready)
To set up production-ready cloud image hosting on Vercel:
1. Sign up for a free account on [Cloudinary](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from your dashboard.
3. Configure these environment variables in your Vercel Dashboard or local `.env` file:
   * `CLOUDINARY_CLOUD_NAME`
   * `CLOUDINARY_API_KEY`
   * `CLOUDINARY_API_SECRET`

