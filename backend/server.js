const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

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

// --- ROUTES ---

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'DOCTOR';
    
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: userRole }
    });
    
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
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
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

// 3. User info
app.get('/api/users/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { 
      verificationResults: true, 
      documents: { include: { extractedData: true } }
    }
  });
  delete user.password;
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
    const { type, firstName, lastName } = req.body; // 'ID_CARD' | 'MEDICAL_LICENSE' | 'DIPLOMA'
    const userId = req.user.userId;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required' });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // OVERWRITE EXISTING DOCUMENTS
    const existingDocs = await prisma.document.findMany({ where: { userId, type: type || 'MEDICAL_LICENSE' } });
    for (const doc of existingDocs) {
      await prisma.extractedData.deleteMany({ where: { documentId: doc.id } });
      await prisma.document.delete({ where: { id: doc.id } });
    }

    // Save document
    const document = await prisma.document.create({
      data: {
        userId,
        type: type || 'MEDICAL_LICENSE',
        fileUrl: req.file.filename
      }
    });

    // REAL OCR EXTRACTION
    let extractedText = "";
    try {
      const { data } = await Tesseract.recognize(req.file.path, 'eng');
      extractedText = data.text;
    } catch (err) {
      console.error("OCR Error:", err);
      return res.status(500).json({ error: 'OCR processing failed' });
    }

    // EXTRACT SPECIFIC DATA VIA REGEX
    const dates = extractedText.match(/\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b/g) || [];
    const issueDate = dates[0] || "";
    const expiryDate = dates[1] || "";
    const licMatch = extractedText.match(/(?:LIC|LICENSE|ID)[-\s:]*([A-Z0-9]+)/i);
    const licenseNumber = licMatch ? licMatch[1] : "";
    const specialtyMatch = extractedText.match(/(?:SPECIALTY|PRACTICE|DEPARTMENT)[-\s:]*([a-zA-Z\s]+)/i);
    const specialty = specialtyMatch ? specialtyMatch[1].trim() : "";

    const words = extractedText.split(/\s+/);
    let bestFirstNameMatch = 0;
    let bestLastNameMatch = 0;

    for (const word of words) {
      const fnSim = calculateSimilarity(word, firstName);
      if (fnSim > bestFirstNameMatch) bestFirstNameMatch = fnSim;
      
      const lnSim = calculateSimilarity(word, lastName);
      if (lnSim > bestLastNameMatch) bestLastNameMatch = lnSim;
    }

    const matchScore = Math.round((bestFirstNameMatch + bestLastNameMatch) / 2);
    const nameMatches = matchScore >= 75; // Threshold for typo tolerance

    // VERIFICATION MOCK API (INTERNAL)
    const isInvalidLicense = licenseNumber.endsWith('00');
    const licenseValid = licenseNumber !== "" && !isInvalidLicense;

    // ADVANCED FRAUD / ANOMALY DETECTION
    const anomalies = [];
    const anomalyTests = { nameMismatch: false, expired: false, duplicate: false, missingData: false };
    
    if (!nameMatches) { anomalies.push('NAME_MISMATCH'); anomalyTests.nameMismatch = true; }
    
    if (!licenseNumber || !issueDate || !expiryDate) {
      anomalies.push('MISSING_DATA');
      anomalyTests.missingData = true;
    }

    let isExpired = false;
    if (expiryDate) {
      const parsedExpiry = new Date(expiryDate);
      if (!isNaN(parsedExpiry) && parsedExpiry < new Date()) {
         isExpired = true;
      }
    }
    if (isExpired) { anomalies.push('EXPIRED_LICENSE'); anomalyTests.expired = true; }

    if (licenseNumber) {
      // Find extracted data with same license but different document/user
      const duplicate = await prisma.extractedData.findFirst({
         where: { jsonData: { contains: `"license_number":"${licenseNumber}"` } }
      });
      if (duplicate && duplicate.documentId !== document.id) {
         anomalies.push('DUPLICATE_LICENSE');
         anomalyTests.duplicate = true;
      }
    }

    // TRUST SCORE ENGINE
    let score = 0;
    const scoreBreakdown = { validLicense: 0, matchingNames: 0, validDates: 0, noAnomalies: 0, deductions: 0 };
    
    if (licenseValid) { score += 40; scoreBreakdown.validLicense = 40; }
    if (nameMatches) { score += 20; scoreBreakdown.matchingNames = 20; }
    if (expiryDate && !isExpired) { score += 20; scoreBreakdown.validDates = 20; }
    if (anomalies.length === 0) { score += 20; scoreBreakdown.noAnomalies = 20; }
    
    // Deductions
    if (anomalyTests.nameMismatch) { score -= 20; scoreBreakdown.deductions -= 20; }
    if (anomalyTests.expired) { score -= 30; scoreBreakdown.deductions -= 30; }
    if (anomalyTests.missingData) { score -= 10; scoreBreakdown.deductions -= 10; }
    if (anomalyTests.duplicate) { score -= 50; scoreBreakdown.deductions -= 50; }
    
    if (score < 0) score = 0;

    // DECISION ENGINE
    let status = 'PENDING';
    if (score >= 80) status = 'APPROVED';
    else if (score >= 50) status = 'PENDING';
    else status = 'REJECTED';

    const mockOcrData = {
      extractedText: extractedText.substring(0, 500), // snippet
      name: `${firstName} ${lastName}`,
      license_number: licenseNumber,
      specialty: specialty,
      issue_date: issueDate,
      expiry_date: expiryDate,
      matchScore,
      anomalyTests,
      scoreBreakdown
    };

    await prisma.extractedData.create({
      data: {
        documentId: document.id,
        jsonData: JSON.stringify(mockOcrData)
      }
    });

    // Update or Create VerificationResult
    const result = await prisma.verificationResult.upsert({
      where: { userId },
      update: {
        licenseValid,
        anomalies: JSON.stringify(anomalies),
        score,
        status
      },
      create: {
        userId,
        licenseValid,
        anomalies: JSON.stringify(anomalies),
        score,
        status
      }
    });

    res.json({ message: 'Pipeline completed', document, result, ocrData: mockOcrData });

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
      verificationResults: true,
      documents: {
        include: { extractedData: true }
      }
    }
  });
  
  const formatted = practitioners.map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    status: p.verificationResults?.status || 'NOT_SUBMITTED',
    score: p.verificationResults?.score || 0,
    anomalies: p.verificationResults ? JSON.parse(p.verificationResults.anomalies) : [],
    documents: p.documents.map(d => ({
      id: d.id,
      type: d.type,
      fileUrl: d.fileUrl,
      extractedData: d.extractedData ? JSON.parse(d.extractedData.jsonData) : null
    }))
  }));

  res.json(formatted);
});

// 7. Admin Dashboard: Review (Approve/Reject)
app.post('/api/admin/practitioners/:id/review', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' or 'REJECTED'

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const result = await prisma.verificationResult.update({
    where: { userId: parseInt(id) },
    data: { status }
  });

  res.json(result);
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
