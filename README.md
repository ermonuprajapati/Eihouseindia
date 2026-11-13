# ⚡ EIHOUSE INDIA (`eihouseindia.in`)

> **Electronics. Engineering. AI. Innovation.**  
> A premier community-driven technology editorial, research, and component knowledge platform built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **Tiptap**, and **Firebase**.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20Storage-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Resend](https://img.shields.io/badge/Resend-Transactional%20Email-black?style=flat-square&logo=resend)](https://resend.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20%2817%20Passed%29-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

---

## 📋 Table of Contents

1. [Architecture & Features Overview](#-architecture--features-overview)
2. [Project Structure](#-project-structure)
3. [Environment Configuration (`.env.local`)](#-environment-configuration-envlocal)
4. [Vercel Deployment Guide](#-vercel-deployment-guide)
5. [Firebase Setup & Deployment](#-firebase-setup--deployment)
6. [Resend Email Setup](#-resend-email-setup)
7. [First-Time Bootstrap Admin & Category Seeding](#-first-time-bootstrap-admin--category-seeding)
8. [Local Development & Verification](#-local-development--verification)
9. [Troubleshooting & Common Questions](#-troubleshooting--common-questions)

---

## 🚀 Architecture & Features Overview

- **Next.js 15 App Router & Server Components**: Fast initial page loads, optimal SEO, and streaming server responses.
- **Role-Based Access Control (RBAC)**: Secure multi-tier permissions (`USER` / `EDITOR` / `ADMIN`) enforced via Firestore Security Rules and server-side Firebase Admin SDK checks.
- **Editorial Review Workflow**:
  - Authors write articles in rich-text and submit for review (`DRAFT` ➔ `PENDING`).
  - Editors and Admins review submissions in `/admin` with atomic decision recording (`PUBLISHED`, `REQUEST_CHANGES`, `REJECTED`, `ARCHIVED`).
  - Authors automatically receive transactional email feedback upon review status changes.
- **Tiptap Rich-Text Publishing Suite**:
  - Semantic HTML & JSON AST document storage.
  - XSS sanitization (disallows dangerous URI schemes like `javascript:` and `data:`).
  - Code blocks, tables, images, headings, and character/word reading time calculation.
- **Pluggable Search & Discovery**: In-memory and index-backed multi-parameter search across titles, excerpts, tags, categories, and author profiles.
- **SEO & Schema.org JSON-LD**:
  - Automatic `BlogPosting`, `BreadcrumbList`, and `Person` structured data markup on every article and profile.
  - Dynamic `sitemap.xml` (`src/app/sitemap.ts`) and `robots.txt` (`src/app/robots.ts`).
- **Interactive Community Features**:
  - Threaded article comments with moderation support.
  - Author public profile pages (`/author/[username]`).
  - Dedicated newsletter subscription.
- **Transactional Notifications via Resend**:
  - Branded editorial notifications dispatched from `info@eihouseindia.in`.
- **Electronics Component Directory**:
  - Scaffolded category directory at `/components` for hardware engineering specifications (Resistors, Capacitors, MOSFETs, MCUs, Sensors, Dev Boards).

---

## 📂 Project Structure

```
eihouse/
├── public/                 # Static assets, branding, and images
├── src/
│   ├── app/                # Next.js 15 App Router
│   │   ├── (public)        # Home (/), Articles (/articles), About, Contact, Terms, etc.
│   │   ├── admin/          # Administrator Console (moderation, user roles, category seed)
│   │   ├── api/            # Server Route Handlers
│   │   │   ├── admin/      # /api/admin/moderate, /api/admin/users/role
│   │   │   ├── health/     # /api/health (Environment & service health check)
│   │   │   └── notifications/ # /api/notifications/email
│   │   ├── auth/           # /auth/login, /auth/register, /auth/forgot-password
│   │   ├── author/         # /author/[username] public profile pages
│   │   ├── blog/           # /blog/[slug] dynamic editorial article pages
│   │   ├── category/       # /category/[slug] category feed pages
│   │   ├── components/     # /components hardware component showcase
│   │   ├── dashboard/      # Author studio & Tiptap editor (/dashboard, /dashboard/editor)
│   │   ├── sitemap.ts      # Dynamic XML sitemap generator
│   │   └── robots.ts       # Robots.txt crawler directives
│   ├── components/         # Reusable UI primitives, cards, header, footer, editor
│   ├── config/             # Site configuration, categories, client & admin Firebase SDKs
│   ├── lib/                # Zod schemas, Tiptap sanitizer/renderer, SEO builders
│   ├── modules/            # Domain services (auth, posts, admin, search, email, storage)
│   └── types/              # Strict TypeScript interfaces & domain models
├── firestore.rules         # Enterprise-grade Firestore security rules
├── storage.rules           # Cloud Storage upload security rules (5MB cap, image MIME filter)
├── firestore.indexes.json  # Pre-configured Firestore composite query indexes
├── firebase.json           # Firebase CLI deployment descriptor
└── next.config.ts          # Next.js standalone optimization & remote image whitelisting
```

---

## 🔐 Environment Configuration (`.env.local`)

A pre-configured template is available at `.env.example`. Create `.env.local` in the project root:

```env
# ==============================================================================
# EIHOUSE INDIA - Environment Configuration
# ==============================================================================

# Application URL
APP_URL="https://eihouseindia.in"
NEXT_PUBLIC_APP_URL="https://eihouseindia.in"

# Firebase Web Client Configuration (Project: eihouseindia)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyC2lJt0ATzGnHhA8mPk1Y_sBs6Zob2EsNY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="eihouseindia.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="eihouseindia"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="eihouseindia.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="836043240644"
NEXT_PUBLIC_FIREBASE_APP_ID="1:836043240644:web:8276e02bcdfdfd63e08591"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-EYDGDV169H"
NEXT_PUBLIC_FIREBASE_DATABASE_ID="(default)"

# Firebase Admin SDK (Server-Side Only - Private Key)
# Obtain from: Firebase Console > Project Settings > Service Accounts > Generate new private key
FIREBASE_PROJECT_ID="eihouseindia"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@eihouseindia.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
# Alternative: Provide the full service account JSON string:
# FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Resend Email Configuration (Server-Side Only)
RESEND_API_KEY="re_YOUR_RESEND_API_KEY"
RESEND_FROM_EMAIL="EIHOUSE INDIA <info@eihouseindia.in>"
CONTACT_EMAIL="info@eihouseindia.in"

# Bootstrap Administrator Email
BOOTSTRAP_ADMIN_EMAIL="er.monuprajapati.2024@gmail.com"

# Optional Gemini API Key
GEMINI_API_KEY=""
```

---

## 🌐 Vercel Deployment Guide

Deploying EIHOUSE INDIA on **Vercel** is seamless. Follow these steps:

### Step 1: Push Code to Git
Push your project to GitHub, GitLab, or Bitbucket:
```bash
git add .
git commit -m "feat: production ready eihouse platform"
git remote add origin https://github.com/<your-username>/eihouse.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New…** ➔ **Project**.
3. Select your repository `eihouse`.
4. Configure Build & General settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Node.js Version**: `20.x` (or `22.x`)

### Step 3: Add Environment Variables in Vercel
Navigate to **Settings** ➔ **Environment Variables** in your Vercel project and add the following keys for **Production**, **Preview**, and **Development**:

| Variable Name | Recommended Value | Scope |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://eihouseindia.in` | Public (Client + Server) |
| `APP_URL` | `https://eihouseindia.in` | Server |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyC2lJt0ATzGnHhA8mPk1Y_sBs6Zob2EsNY` | Public |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `eihouseindia.firebaseapp.com` | Public |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `eihouseindia` | Public |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `eihouseindia.firebasestorage.app` | Public |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `836043240644` | Public |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:836043240644:web:8276e02bcdfdfd63e08591` | Public |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-EYDGDV169H` | Public |
| `NEXT_PUBLIC_FIREBASE_DATABASE_ID` | `(default)` | Public |
| `RESEND_API_KEY` | `re_YOUR_RESEND_API_KEY` | Secret (Server only) |
| `RESEND_FROM_EMAIL` | `EIHOUSE INDIA <info@eihouseindia.in>` | Server |
| `CONTACT_EMAIL` | `info@eihouseindia.in` | Server |
| `BOOTSTRAP_ADMIN_EMAIL` | `er.monuprajapati.2024@gmail.com` | Server |
| `FIREBASE_PROJECT_ID` | `eihouseindia` | Server |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk@eihouseindia.iam.gserviceaccount.com` | Server |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Secret (Server only) |

> [!TIP]
> If you prefer, instead of setting `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` separately, you can set a single environment variable `FIREBASE_SERVICE_ACCOUNT_KEY` containing the entire JSON downloaded from the Firebase Console.

### Step 4: Configure Custom Domain (`eihouseindia.in`)
1. In Vercel Project Settings, navigate to **Domains**.
2. Add `eihouseindia.in` and `www.eihouseindia.in`.
3. In your DNS provider (e.g. GoDaddy, Cloudflare, Namecheap), add the required records:
   - **A Record**: `@` points to `76.76.21.21`
   - **CNAME Record**: `www` points to `cname.vercel-dns.com`
4. Once verified, Vercel will automatically provision SSL certificates.

---

## 🛠️ Firebase Setup & Deployment

### 1. Enable Authentication Providers
In [Firebase Console](https://console.firebase.google.com/) for project **`eihouseindia`**:
1. Open **Authentication** ➔ **Sign-in method**.
2. Enable **Email/Password**.
3. Enable **Google**.
4. Open **Settings** tab in Authentication ➔ **Authorized domains** ➔ click **Add domain**:
   - `eihouseindia.in`
   - `www.eihouseindia.in`
   - `<your-project-name>.vercel.app`

### 2. Deploy Firestore & Storage Rules + Indexes
From your local terminal, deploy the production rules and query indexes:
```bash
# Login to Firebase
npx firebase login

# Select the project
npx firebase use eihouseindia

# Deploy rules and indexes
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 3. Generate Service Account Key (Firebase Admin SDK)
1. Go to **Project Settings** (gear icon) ➔ **Service accounts**.
2. Select **Firebase Admin SDK** ➔ click **Generate new private key**.
3. Copy `client_email` into `FIREBASE_CLIENT_EMAIL` and `private_key` into `FIREBASE_PRIVATE_KEY` (or paste the whole file into `FIREBASE_SERVICE_ACCOUNT_KEY`).

---

## 📧 Resend Email Setup

All transactional editorial notifications are dispatched through [Resend](https://resend.com):
- **Sender Address**: `info@eihouseindia.in` (configured as requested, no `noreply`).
- **Resend API Key**: Configure via `RESEND_API_KEY` in environment variables.

### Verifying Domain in Resend:
1. Open your [Resend Domains Dashboard](https://resend.com/domains).
2. Click **Add Domain** and enter `eihouseindia.in`.
3. Add the displayed DNS records (SPF, DKIM, and DMARC TXT records) in your DNS manager.
4. Once verified, all emails sent via `info@eihouseindia.in` will land directly in the recipient's primary inbox with SPF/DKIM alignment.

---

## 👑 First-Time Bootstrap Admin & Category Seeding

To bootstrap the site with all 10 core editorial disciplines:

1. Deploy the site or run locally (`npm run dev`).
2. Click **Sign In** and sign in using Google with the designated administrator account:
   - **`er.monuprajapati.2024@gmail.com`**
3. Navigate directly to **`/admin`**.
4. Because this email matches `BOOTSTRAP_ADMIN_EMAIL`, you receive immediate administrative access.
5. In the **Admin Console**, click **Sync Default 10 Categories** under the **Categories** tab:
   - Embedded Systems & Firmware
   - Semiconductor & VLSI Design
   - Robotics & Automation
   - IoT & Connected Devices
   - Artificial Intelligence & Edge ML
   - Power Electronics & Energy
   - PCB Design & Hardware Engineering
   - Telecommunications & Wireless (5G/6G)
   - Sensors, Instrumentation & Actuators
   - Automotive & Industrial Electronics
6. You can now invite contributors, review article submissions, assign `EDITOR` or `ADMIN` roles, and manage publication settings.

---

## 💻 Local Development & Verification

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x`+

### Commands

```bash
# Install dependencies
npm install

# Run Vitest unit & integration tests
npm test

# Run TypeScript strict typecheck
npm run typecheck

# Run ESLint check
npm run lint

# Start local Next.js development server
npm run dev

# Create optimized production build
npm run build

# Start production server
npm run start
```

---

## ❓ Troubleshooting & Common Questions

### 1. `Firestore client is offline`
- Ensure you have an active internet connection.
- Verify that `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in `.env.local` is set to `eihouseindia`.
- Check that your client IP is not blocked by enterprise proxy settings.

### 2. Google Sign-In gives `auth/unauthorized-domain`
- Add your Vercel URL (e.g. `eihouse-preview.vercel.app`) and `eihouseindia.in` to **Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains**.

### 3. Server Actions or Moderation API returns 503
- Ensure `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (or `FIREBASE_SERVICE_ACCOUNT_KEY`) are set in your Vercel Environment Variables.
- Make sure private key newlines (`\n`) are preserved.

### 4. Health Check Endpoint
You can quickly verify that your deployment is configured correctly by opening:
```
https://eihouseindia.in/api/health
```
It returns JSON indicating whether Firebase Client, Admin SDK, and Resend are properly connected.

---

## 📄 License

Private & Proprietary © 2026 **EIHOUSE INDIA** (`eihouseindia.in`). All rights reserved.
