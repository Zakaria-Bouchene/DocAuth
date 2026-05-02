# DocAuth — Implementation Guide

> A production-ready Trusted Practitioner Onboarding & Verification System for healthcare platforms.
> This guide explains how to set up and run the project locally from scratch.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Verification Pipeline](#verification-pipeline)
- [Trust Score Logic](#trust-score-logic)
- [Anomaly Detection Rules](#anomaly-detection-rules)
- [Test Scenarios](#test-scenarios)
- [Database Schema](#database-schema)
- [Known Limitations & Roadmap](#known-limitations--roadmap)

---

## Project Overview

DocAuth is a full-stack MVP that allows healthcare platforms to verify practitioners (doctors, clinics, labs) through an AI-powered document verification pipeline:

- **OCR** via `tesseract.js` — real text extraction from uploaded images
- **Anomaly Detection** — name mismatch, expired license, duplicate license, missing data
- **Trust Scoring** — weighted 0–100 score based on verification results
- **Decision Engine** — Auto-Approved (≥80), Needs Review (50–79), Rejected (<50)
- **Admin Dashboard** — full profile view with per-test breakdown per applicant

---

## Project Structure

```
DocAuth/
├── backend/              # Node.js/Express API server
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── dev.db        # SQLite database file (auto-generated)
│   ├── uploads/          # Uploaded documents (auto-generated)
│   ├── server.js         # Main application server
│   └── package.json
├── frontend/             # Next.js frontend application
│   ├── app/
│   │   ├── page.tsx      # Landing page
│   │   ├── login/        # Login page
│   │   ├── register/     # Registration page
│   │   ├── dashboard/    # Practitioner dashboard
│   │   └── admin/        # Admin dashboard
│   └── package.json
└── IMPLEMENTATION.md     # This file
```

---

## Prerequisites

Make sure you have the following installed before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18 or higher | https://nodejs.org |
| npm | v9 or higher | Included with Node.js |
| Git | Any recent version | https://git-scm.com |

> **Note:** This project uses SQLite as the database — no database server install is required.

---

## Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

### 1. Install dependencies

```bash
npm install
```

This installs: `express`, `prisma`, `tesseract.js`, `jsonwebtoken`, `bcryptjs`, `multer`, `cors`, `dotenv`, and `nodemon`.

### 2. Initialize the database

Run the Prisma migration to create the SQLite database and all tables:

```bash
npx prisma migrate dev --name init
```

> This will create `backend/prisma/dev.db` automatically.

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Start the backend server

**For development (auto-restarts on file changes):**
```bash
npm run dev
```

**For production:**
```bash
npm start
```

The backend runs on: **http://localhost:3001**

---

## Frontend Setup

Open a **second terminal** and navigate to the `frontend` directory:

```bash
cd frontend
```

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The frontend runs on: **http://localhost:3000**

---

## Running the Application

Once both servers are running, open your browser and go to:

```
http://localhost:3000
```

### Default Admin Account

To create an admin account, use the registration page and set the role to `ADMIN`:

> **Tip:** Register with `role: ADMIN` from the registration form, or directly call the API:
> ```bash
> curl -X POST http://localhost:3001/api/auth/register \
>   -H "Content-Type: application/json" \
>   -d '{"name":"Admin","email":"admin@docauth.com","password":"admin123","role":"ADMIN"}'
> ```

---

## API Reference

All routes are prefixed with `http://localhost:3001`.

### Authentication

| Method | Route | Description | Auth Required |
|--------|-------|-------------|:---:|
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login and get JWT token | ❌ |
| `GET` | `/api/users/me` | Get current user profile + docs | ✅ |

### Verification Pipeline

| Method | Route | Description | Auth Required |
|--------|-------|-------------|:---:|
| `POST` | `/api/verify` | Upload document and run full pipeline | ✅ (DOCTOR) |
| `GET` | `/api/mock-verify-license/:license_number` | Mock license authority check | ❌ |

#### `POST /api/verify` — Request Body (multipart/form-data)

| Field | Type | Description |
|-------|------|-------------|
| `document` | `File` | Image file (JPG, PNG) of the medical document |
| `type` | `string` | Document type: `MEDICAL_LICENSE`, `ID_CARD`, `DIPLOMA` |
| `firstName` | `string` | Practitioner's first name as it appears on the document |
| `lastName` | `string` | Practitioner's last name as it appears on the document |

### Admin Routes

| Method | Route | Description | Auth Required |
|--------|-------|-------------|:---:|
| `GET` | `/api/admin/practitioners` | List all practitioners with full details | ✅ (ADMIN) |
| `POST` | `/api/admin/practitioners/:id/review` | Manually approve or reject | ✅ (ADMIN) |

---

## Verification Pipeline

When a document is submitted, the backend runs this exact pipeline:

```
1. File Upload (multer)
       ↓
2. Real OCR Extraction (tesseract.js)
       ↓
3. Regex Data Structuring
   → License Number (e.g., LIC-12345)
   → Issue Date & Expiry Date (DD/MM/YYYY or YYYY-MM-DD)
   → Specialty keyword
       ↓
4. Anomaly Detection (4 checks)
       ↓
5. Trust Score Calculation (0–100)
       ↓
6. Decision Engine
   → Score ≥ 80  → APPROVED
   → Score 50–79 → PENDING (needs admin review)
   → Score < 50  → REJECTED
       ↓
7. Result saved to DB + returned to client
```

---

## Trust Score Logic

| Check | Points Awarded |
|-------|:--------------:|
| Valid License (internal API check) | **+40** |
| Name matches OCR text (≥75% similarity) | **+20** |
| Valid (non-expired) dates found | **+20** |
| No anomalies detected (bonus) | **+20** |
| **Total Maximum** | **100** |

### Deductions

| Anomaly | Points Deducted |
|---------|:--------------:|
| Name Mismatch | **−20** |
| Expired License | **−30** |
| Missing Data | **−10** |
| Duplicate License | **−50** |

---

## Anomaly Detection Rules

| Flag | Trigger Condition |
|------|-------------------|
| `NAME_MISMATCH` | The similarity between the form name and OCR-extracted name is below 75% |
| `EXPIRED_LICENSE` | The expiry date extracted from the document is before today's date |
| `MISSING_DATA` | No license number, issue date, or expiry date could be found in the document |
| `DUPLICATE_LICENSE` | The extracted license number is already linked to a different user in the database |

> **Name Matching**: Uses a Levenshtein distance algorithm for typo tolerance, so minor OCR character errors don't falsely fail real documents.

---

## Test Scenarios

### ✅ Test a clean APPROVED document

Upload an image that clearly shows:
- The practitioner's first and last name (type them exactly in the form)
- A license identifier like `LIC-12345`
- Future dates like `01/01/2025` and `01/01/2030`

**Expected:** Score = 100, Status = `APPROVED`

---

### ⚠️ Test a PENDING document (name mismatch)

Upload any image but type a slightly wrong first name in the form.

**Expected:** `NAME_MISMATCH` flag, Score drops to ~60–70, Status = `PENDING`

---

### ❌ Test a REJECTED document (expired + missing data)

Upload a plain white image (no text) or an image with only an old date like `01/01/2019`.

**Expected:** `EXPIRED_LICENSE` + `MISSING_DATA` flags, Score < 50, Status = `REJECTED`

---

### 🔴 Test DUPLICATE LICENSE detection

1. Log in as **Doctor A**, upload a document containing `LIC-99901`
2. Register a new **Doctor B**, upload any document containing the same text `LIC-99901`

**Expected for Doctor B:** `DUPLICATE_LICENSE` flag, major score deduction

---

## Database Schema

```
User
├── id (PK)
├── name
├── email (unique)
├── password (hashed with bcrypt)
└── role ('DOCTOR' | 'ADMIN')

Document
├── id (PK)
├── userId (FK → User)
├── type ('MEDICAL_LICENSE' | 'ID_CARD' | 'DIPLOMA')
└── fileUrl (filename in /uploads)

ExtractedData
├── id (PK)
├── documentId (FK → Document, unique)
└── jsonData (JSON string with OCR results, anomaly tests, score breakdown)

VerificationResult
├── id (PK)
├── userId (FK → User, unique)
├── licenseValid (boolean)
├── anomalies (JSON array of flag strings)
├── score (0–100)
└── status ('APPROVED' | 'PENDING' | 'REJECTED')
```

---

## Known Limitations & Roadmap

### Current Limitations

- **Database**: Uses SQLite (zero config). Suitable for development; should be migrated to PostgreSQL for production.
- **OCR Quality**: Tesseract.js works best on clear, printed, high-contrast images. Handwritten or low-resolution scans may produce poor results.
- **File Storage**: Uploaded files are stored locally in `backend/uploads/`. For production, use a cloud storage provider (AWS S3, Cloudinary, etc.).
- **JWT Secret**: Currently hardcoded. Must be moved to a `.env` file before any deployment.

### Planned Improvements

- [ ] Migrate database to PostgreSQL
- [ ] Move JWT secret and config to `.env` file
- [ ] Add email notification system for status changes
- [ ] Add audit log table for all admin actions
- [ ] Integrate a real government license verification API
- [ ] Add image preprocessing before OCR (contrast boost, deskew)
- [ ] Support multi-document upload per application (ID + License + Diploma)
- [ ] Add pagination to admin dashboard

---

> **Last updated:** 2026-05-02
> This file is maintained alongside the codebase and updated with every new feature or command.
