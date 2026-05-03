const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecret_docauth_mvp';

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// --- UTILS ---
async function createAuditLog(userId, action, details = null, txHash = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
        txHash
      }
    });
  } catch (err) {
    console.error("Audit Log Error:", err);
  }
}

async function createVerificationLog(userId, checkType, result, details = null) {
  try {
    await prisma.verificationLog.create({
      data: {
        userId,
        checkType,
        result,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (err) {
    console.error("Verification Log Error:", err);
  }
}

// --- TRUST SCORE ENGINE ---
function calculateTrustScore(checks) {
  let score = 0;
  if (checks.identityVerified) score += 25;
  if (checks.degreeValid) score += 20;
  if (checks.registrationValid) score += 30;
  if (checks.dspValid) score += 15;
  if (checks.specialistValidated) score += 10;

  // Deduct for anomalies
  if (checks.anomalies && checks.anomalies.length > 0) {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

// --- DECISION ENGINE ---
function determineStatus(score) {
  if (score >= 90) return 'verified';
  if (score >= 70) return 'pending';
  if (score >= 50) return 'review_required';
  return 'rejected';
}

// --- ROUTES ---

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name, email, password, role, phone,
      dateOfBirth, nationalId, specialty, licenseNumber,
      institution, graduationYear, country,
      degreeType, practiceType, wilaya
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'DOCTOR';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        phone,
        dateOfBirth,
        nationalId,
        specialty,
        licenseNumber,
        institution,
        graduationYear,
        country,
        degreeType,
        practiceType,
        wilaya,
        profileStatus: 'incomplete',
        trustScore: 0,
        verificationStatus: 'pending'
      }
    });

    await createAuditLog(user.id, 'REGISTER', { email: user.email, role: user.role });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(400).json({ error: 'Email already exists or invalid data.' });
  }
});

// 2. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await createAuditLog(user.id, 'LOGIN', { ip: req.ip });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

// 2b. Profile: Save Draft (Progressive Persistence)
app.post('/api/profile/draft', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via draft
    delete updateData.id;
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        profileStatus: 'incomplete' // Keep as incomplete until final submission
      }
    });

    res.json({ message: 'Draft saved successfully', user: { id: user.id, name: user.name } });
  } catch (err) {
    console.error("Draft Save Error:", err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// 3. User info
app.get('/api/users/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      verificationResults: true,
      documents: {
        include: { extractedData: true },
        orderBy: { createdAt: 'desc' }
      },
      verificationLogs: {
        orderBy: { timestamp: 'desc' }
      }
    }
  });
  if (user) delete user.password;
  res.json(user);
});

// 4. Mock License Verification API
app.get('/api/mock-verify-license/:license_number', (req, res) => {
  const { license_number } = req.params;
  // Let's mock: licenses ending in '00' are invalid, others valid
  if (license_number.endsWith('00')) {
    return res.json({ valid: false, authority: 'Mock Medical Board' });
  }
  res.json({ valid: true, authority: 'Mock Medical Board' });
});

// Similarity algorithm
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const a = str1.toLowerCase();
  const b = str2.toLowerCase();
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 100;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  const dist = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 100 - (dist / maxLen) * 100);
}

// --- AI FORENSIC ANALYST ---
async function runForensicAnalysis(documentType, userName, ocrText, systemSignals = {}) {
  const { blurScore = 0, elaScore = 0, layoutScore = 0 } = systemSignals;

  const prompt = `
You are a forensic fraud detection AI specialized in Algerian official and medical documents.

You are operating in STRICT TEST MODE.

Your goal is NOT to be lenient. Your goal is to detect ANY possible fraud, inconsistency, or weakness in the document or verification system.

You must assume that many uploaded documents may be fake, manipulated, incomplete, or artificially generated.

STRICT RULES:

1. If ANY important field is missing → mark as HIGH RISK
2. If document structure is unclear or inconsistent → HIGH RISK
3. If official keywords are missing (e.g. République Algérienne, Ministère) → HIGH RISK
4. If name matching is weak or ambiguous → MEDIUM or HIGH RISK
5. If document looks too clean, too digital, or lacks real scan noise → flag as SUSPICIOUS
6. If stamp or signature is missing or unclear → HIGH RISK
7. If OCR text is too poor or incomplete → DO NOT trust the document

You must actively try to REJECT documents unless there is strong evidence of authenticity.

Be stricter than a human auditor.

Return ONLY JSON.

Required output schema:
{
  "isAuthentic": boolean,
  "confidence": number,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "decision": "ACCEPT" | "REVIEW" | "REJECT",
  "fraudSignals": [
    "MISSING_KEYWORDS",
    "LOW_TEXT_QUALITY",
    "NAME_MISMATCH",
    "NO_STAMP",
    "LAYOUT_INCONSISTENT",
    "SUSPICIOUS_IMAGE"
  ],
  "weakPointsInSystem": [
    "Explain what part of the verification system could be bypassed"
  ],
  "analysis": {
    "textConsistency": number,
    "layoutConsistency": number,
    "stampPresence": number,
    "tamperingRisk": number
  }
}

Document Type: ${documentType}
User Name: ${userName}

OCR Extracted Text:
${ocrText}

System Signals:
- blurScore: ${blurScore}
- elaScore: ${elaScore}
- layoutScore: ${layoutScore}

IMPORTANT:
This document may be fake or randomly generated.
Be strict and try to find reasons to reject it.

Analyze the document.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON from potential markdown blocks
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    
    // Ensure analysis object exists for frontend compatibility
    if (!parsed.analysis) {
      parsed.analysis = {
        textConsistency: parsed.isAuthentic ? 0.9 : 0.4,
        layoutConsistency: layoutScore,
        stampPresence: parsed.fraudSignals?.includes('NO_STAMP') ? 0.1 : 0.8,
        tamperingRisk: parsed.riskLevel === 'HIGH' ? 0.9 : 0.2
      };
    }
    
    return parsed;
  } catch (err) {
    console.error("Forensic Analysis Error:", err);
    return {
      isAuthentic: false,
      confidence: 0,
      riskLevel: "HIGH",
      decision: "REJECT",
      fraudSignals: ["AI_ANALYSIS_FAILED"],
      weakPointsInSystem: ["The AI forensic analysis module failed to respond, potentially allowing unverified documents to bypass strict checks."],
      analysis: { textConsistency: 0, layoutConsistency: 0, stampPresence: 0, tamperingRisk: 1 }
    };
  }
}

// --- VERIFICATION ENGINE (REUSABLE) ---
async function runFullVerification(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { documents: { include: { extractedData: true } } }
  });

  const checks = {
    identityVerified: false,
    degreeValid: false,
    registrationValid: false,
    dspValid: false,
    specialistValidated: false,
    forensicResults: null,
    anomalies: []
  };

  const docs = user.documents;
  const findDoc = (t) => docs.find(d => d.type === t);

  // 1. OCR Extraction (if not already done)
  for (const doc of docs) {
    if (!doc.extractedData || JSON.parse(doc.extractedData.jsonData).extractedText === "") {
      try {
        const processedImageBuffer = await sharp(path.join(uploadDir, doc.fileUrl))
          .grayscale()
          .resize(2000)
          .normalize()
          .sharpen()
          .toBuffer();

        const { data } = await Tesseract.recognize(processedImageBuffer, 'eng');

        await prisma.extractedData.upsert({
          where: { documentId: doc.id },
          update: { jsonData: JSON.stringify({ extractedText: data.text }) },
          create: { documentId: doc.id, jsonData: JSON.stringify({ extractedText: data.text }) }
        });
        doc.extractedData = { jsonData: JSON.stringify({ extractedText: data.text }) };
      } catch (err) {
        console.error(`OCR Error for doc ${doc.id}:`, err);
      }
    }
  }

  // Identity Verification (KYC)
  const idDoc = findDoc('ID_CARD');
  const selfieDoc = findDoc('SELFIE');
  if (idDoc && idDoc.extractedData) {
    const idText = JSON.parse(idDoc.extractedData.jsonData).extractedText;
    const nameMatch = calculateSimilarity(idText, user.name) > 75;
    const idMatch = user.nationalId ? idText.includes(user.nationalId) : true;

    if (nameMatch && idMatch) {
      if (selfieDoc) {
        checks.identityVerified = true;
        await createVerificationLog(userId, 'IDENTITY', 'PASS', { detail: 'Name and ID match. Selfie present.' });
      } else {
        await createVerificationLog(userId, 'IDENTITY', 'WARNING', { detail: 'ID matches but selfie missing.' });
      }
    } else {
      checks.anomalies.push('ID_NAME_MISMATCH');
      await createVerificationLog(userId, 'IDENTITY', 'FAIL', { detail: 'Name on ID does not match profile.' });
    }
  }

  // Medical Degree
  const degreeDoc = findDoc('DEGREE');
  if (degreeDoc && degreeDoc.extractedData) {
    const degreeText = JSON.parse(degreeDoc.extractedData.jsonData).extractedText;
    const nameMatch = calculateSimilarity(degreeText, user.name) > 75;
    if (nameMatch) {
      checks.degreeValid = true;
      await createVerificationLog(userId, 'DEGREE', 'PASS');
    } else {
      checks.anomalies.push('DEGREE_NAME_MISMATCH');
      await createVerificationLog(userId, 'DEGREE', 'FAIL');
    }
  }

  // Medical Council Registration
  const regDoc = findDoc('REGISTRATION');
  if (regDoc) {
    checks.registrationValid = true;
    await createVerificationLog(userId, 'REGISTRATION', 'PASS');
  }

  // DSP License
  const dspDoc = findDoc('DSP');
  if (dspDoc) {
    checks.dspValid = true;
    await createVerificationLog(userId, 'DSP', 'PASS');
  }

  // Specialist Flow (Conditional)
  if (user.degreeType === 'Specialist') {
    const residency = findDoc('RESIDENCY_CERT');
    if (residency) checks.specialistValidated = true;
  } else {
    checks.specialistValidated = true;
  }

  // 3. AI Forensic Analysis
  const primaryDoc = findDoc('DEGREE') || findDoc('MEDICAL_LICENSE') || findDoc('ID_CARD');
  if (primaryDoc && primaryDoc.extractedData) {
    const ocrText = JSON.parse(primaryDoc.extractedData.jsonData).extractedText;
    
    // Generate system signals
    let systemSignals = { blurScore: 0.5, elaScore: 0.2, layoutScore: 0.8 };
    try {
      const stats = await sharp(path.join(uploadDir, primaryDoc.fileUrl)).stats();
      systemSignals.blurScore = (stats.channels[0].stdev / 128).toFixed(2);
      systemSignals.elaScore = (0.1 + Math.random() * 0.3).toFixed(2); // Simulated ELA
      systemSignals.layoutScore = (0.7 + Math.random() * 0.3).toFixed(2); // Simulated Layout
    } catch (e) {
      console.warn("Signal generation error:", e);
    }

    checks.forensicResults = await runForensicAnalysis(primaryDoc.type, user.name, ocrText, systemSignals);
    
    if (!checks.forensicResults.isAuthentic || checks.forensicResults.riskLevel === 'HIGH' || checks.forensicResults.decision === 'REJECT') {
      checks.anomalies.push('POTENTIAL_FRAUD_DETECTED');
    }
  }

  // Timeline Validation (Mock)
  if (user.graduationYear && regDoc) {
    await createVerificationLog(userId, 'TIMELINE', 'PASS');
  }

  // Duplicate Detection
  const duplicateId = await prisma.user.findFirst({
    where: { nationalId: user.nationalId, NOT: { id: userId } }
  });
  if (duplicateId && user.nationalId) {
    checks.anomalies.push('DUPLICATE_NATIONAL_ID');
  }

  // 4. TRUST SCORE ENGINE
  const score = calculateTrustScore(checks);
  const status = determineStatus(score);

  // 5. DECISION ENGINE & PROFILE UPDATE
  await prisma.user.update({
    where: { id: userId },
    data: {
      trustScore: score,
      verificationStatus: status,
      profileStatus: (checks.identityVerified && checks.degreeValid && checks.registrationValid && checks.dspValid) ? 'pending' : 'incomplete'
    }
  });

  // Update VerificationResult for compatibility with old admin dashboard
  await prisma.verificationResult.upsert({
    where: { userId },
    update: {
      licenseValid: checks.registrationValid,
      anomalies: JSON.stringify(checks.anomalies),
      score,
      status: status.toUpperCase(),
      forensicData: checks.forensicResults ? JSON.stringify(checks.forensicResults) : null
    },
    create: {
      userId,
      licenseValid: checks.registrationValid,
      anomalies: JSON.stringify(checks.anomalies),
      score,
      status: status.toUpperCase(),
      forensicData: checks.forensicResults ? JSON.stringify(checks.forensicResults) : null
    }
  });

  return { score, status, checks };
}

// 5a. Standalone Upload (Instant Feedback)
app.post('/api/upload-document', authenticate, upload.single('document'), async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.userId;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Overwrite if same type exists for this user
    const existing = await prisma.document.findFirst({ where: { userId, type } });
    if (existing) {
      await prisma.extractedData.deleteMany({ where: { documentId: existing.id } });
      await prisma.document.delete({ where: { id: existing.id } });
    }

    const document = await prisma.document.create({
      data: {
        userId,
        type,
        fileUrl: req.file.filename,
        verificationStatus: 'uploaded'
      }
    });

    await createAuditLog(userId, 'UPLOAD', { type, filename: req.file.filename });
    res.json({ message: 'File uploaded successfully', document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// 5b. Trigger Full Verification
app.post('/api/verify-full', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await runFullVerification(userId);
    await createAuditLog(userId, 'PROCESS_VERIFICATION', result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification processing failed' });
  }
});

// Deprecated (kept for temporary compatibility)
app.post('/api/verify', authenticate, upload.single('document'), async (req, res) => {
  res.status(410).json({ error: 'Endpoint deprecated. Use /api/upload-document and /api/verify-full' });
});

// 6. Admin Dashboard: Get all practitioners
app.get('/api/admin/practitioners', authenticate, requireAdmin, async (req, res) => {
  const practitioners = await prisma.user.findMany({
    where: { role: 'DOCTOR' },
    include: {
      documents: {
        include: { extractedData: true }
      },
      verificationLogs: true,
      verificationResults: true
    }
  });

  const formatted = practitioners.map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    nationalId: p.nationalId,
    profileStatus: p.profileStatus,
    verificationStatus: p.verificationStatus,
    trustScore: p.trustScore,
    degreeType: p.degreeType,
    practiceType: p.practiceType,
    wilaya: p.wilaya,
    documents: p.documents.map(d => ({
      id: d.id,
      type: d.type,
      fileUrl: d.fileUrl,
      status: d.verificationStatus,
      extractedData: d.extractedData ? JSON.parse(d.extractedData.jsonData) : null
    })),
    logs: p.verificationLogs,
    forensicData: p.verificationResults?.forensicData ? JSON.parse(p.verificationResults.forensicData) : null
  }));

  res.json(formatted);
});

// 7. Admin Dashboard: Review (Approve/Reject)
app.post('/api/admin/practitioners/:id/review', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, annotations } = req.body; // 'APPROVED' or 'REJECTED'

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const result = await prisma.verificationResult.update({
    where: { userId: parseInt(id) },
    data: {
      status,
      annotations: annotations ? JSON.stringify(annotations) : undefined
    }
  });

  await createAuditLog(req.user.userId, `ADMIN_${status}`, { practitionerId: id, annotations });

  res.json(result);
});

// 8. Admin Dashboard: Get Audit Logs
app.get('/api/admin/audit', authenticate, requireAdmin, async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    include: { user: { select: { name: true, email: true } } },
    take: 100
  });
  res.json(logs);
});

// 9. Admin Dashboard: Blockchain Anchor (Mock)
app.post('/api/admin/anchor/:logId', authenticate, requireAdmin, async (req, res) => {
  const { logId } = req.params;

  // Mock blockchain anchoring
  const txHash = '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

  const log = await prisma.auditLog.update({
    where: { id: parseInt(logId) },
    data: { txHash }
  });

  res.json({ message: 'Anchored to blockchain', txHash, log });
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
