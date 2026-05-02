# DocAuth - Trusted Practitioner Onboarding MVP
khaled
DocAuth is an MVP web application for onboarding and verifying digital healthcare practitioners. It implements a complete trust verification pipeline including document upload, OCR extraction (mocked), license verification (mocked), anomaly detection, trust scoring, and an admin decision engine.

## Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, Prisma ORM, SQLite
- **Auth**: JWT Authentication

## Setup Instructions

### 1. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm start
```
The backend will run on `http://localhost:3001`.

### 2. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:3000`.

## Testing the MVP

1. Open `http://localhost:3000` in your browser.
2. Click **Register Account** to create a Practitioner account.
3. Log in and access the **Practitioner Dashboard**.
4. Upload a document (image or PDF). 
   - **MOCK OCR TRIGGERS**: 
     - Name the file with `mismatch` (e.g., `license_mismatch.pdf`) to simulate a name mismatch anomaly.
     - Name the file with `expired` to simulate an expired license anomaly.
     - Name the file with `invalid` to simulate an invalid license number.
     - Normal file names will simulate a valid, clean extraction with a score of >= 80 (Auto-Approved).
5. Watch the system automatically score and decide the status of your application.
6. Register another account, but select the **Administrator** role.
7. Log in as the Administrator to see the **Verification Queue**.
8. From here, you can view the calculated Trust Scores, see any Anomalies (Flags), and Manually Approve or Reject pending practitioners.

## Database Schema Overview
- **User**: Stores practitioner and admin accounts.
- **Document**: Stores uploaded document metadata and file paths.
- **ExtractedData**: Stores JSON output from the (mock) OCR engine.
- **VerificationResult**: Stores the final status, Trust Score, and any detected anomalies (fraud flags).
