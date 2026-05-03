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
    const allowedRoles = ['DOCTOR', 'PHARMACIST', 'ADMIN'];
    const userRole = allowedRoles.includes(role) ? role : 'DOCTOR';

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

// 5. Upload & Verification Pipeline
app.post('/api/verify', authenticate, upload.single('document'), async (req, res) => {
  try {
    const { type } = req.body; 
    const userId = req.user.userId;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // 1. OCR Extraction with sharp pre-processing
    let extractedText = "";
    try {
      const processedImageBuffer = await sharp(req.file.path)
        .grayscale()
        .resize(2000)
        .normalize()
        .sharpen()
        .toBuffer();

      const { data } = await Tesseract.recognize(processedImageBuffer, 'eng');
      extractedText = data.text;
    } catch (err) {
      console.error("OCR Error:", err);
      return res.status(500).json({ error: 'OCR processing failed' });
    }

    // 2. Progressive Persistence: Save Document
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
        extractedData: {
          create: { jsonData: JSON.stringify({ extractedText }) }
        }
      }
    });

    // 3. CROSS-VALIDATION ENGINE
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
      anomalies: []
    };

    const docs = user.documents;
    const findDoc = (t) => docs.find(d => d.type === t);

    // Identity Verification (KYC)
    const idDoc = findDoc('ID_CARD');
    const selfieDoc = findDoc('SELFIE');
    if (idDoc) {
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
    if (degreeDoc) {
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
        status: status.toUpperCase()
      },
      create: {
        userId,
        licenseValid: checks.registrationValid,
        anomalies: JSON.stringify(checks.anomalies),
        score,
        status: status.toUpperCase()
      }
    });

    await createAuditLog(userId, 'DOC_UPLOAD', { type, score, status });

    res.json({ message: 'Document processed', score, status, checks, currentDoc: document.id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Admin Dashboard: Get all practitioners
app.get('/api/admin/practitioners', authenticate, requireAdmin, async (req, res) => {
  const practitioners = await prisma.user.findMany({
    where: { role: 'DOCTOR' },
    include: {
      documents: {
        include: { extractedData: true }
      },
      verificationLogs: true
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
    logs: p.verificationLogs
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
