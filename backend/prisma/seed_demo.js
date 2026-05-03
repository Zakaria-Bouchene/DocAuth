const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Demo Data for Jury...');

  // 1. Clear existing data (optional, but good for a fresh demo)
  // await prisma.verificationResult.deleteMany();
  // await prisma.document.deleteMany();
  // await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@docauth.dz' },
    update: {},
    create: {
      name: 'Dr. Admin User',
      email: 'admin@docauth.dz',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '+213 555 123 456',
      profileStatus: 'verified',
    }
  });

  // 3. Create a "Perfect" Practitioner (Dr. Sarah)
  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@clinic.dz' },
    update: {},
    create: {
      name: 'Dr. Sarah Amrani',
      email: 'sarah@clinic.dz',
      password: hashedPassword,
      role: 'DOCTOR',
      phone: '+213 661 000 111',
      wilaya: 'Algiers',
      specialty: 'Cardiology',
      licenseNumber: 'ALG-998877',
      institution: 'University of Algiers',
      graduationYear: '2015',
      degreeType: 'Specialist',
      practiceType: 'Public',
      nationalId: '123456789012',
      trustScore: 95,
      verificationStatus: 'verified',
      profileStatus: 'pending'
    }
  });

  // Create Forensic Data for Sarah
  await prisma.verificationResult.upsert({
    where: { userId: sarah.id },
    update: {},
    create: {
      userId: sarah.id,
      licenseValid: true,
      anomalies: JSON.stringify([]),
      score: 95,
      status: 'APPROVED',
      forensicData: JSON.stringify({
        isAuthentic: true,
        confidence: 0.98,
        riskLevel: 'LOW',
        decision: 'ACCEPT',
        fraudSignals: [],
        weakPointsInSystem: ["None detected. High-quality original scan."],
        analysis: {
          textConsistency: 0.95,
          layoutConsistency: 0.98,
          stampPresence: 0.92,
          tamperingRisk: 0.05
        }
      })
    }
  });

  // 4. Create a "Suspicious" Practitioner (The Fraud Case)
  const suspect = await prisma.user.upsert({
    where: { email: 'suspect@fake.dz' },
    update: {},
    create: {
      name: 'Mohammed (Identity Theft)',
      email: 'suspect@fake.dz',
      password: hashedPassword,
      role: 'DOCTOR',
      phone: '+213 770 999 888',
      wilaya: 'Oran',
      specialty: 'General Medicine',
      licenseNumber: 'FAKE-000',
      institution: 'Unknown Academy',
      graduationYear: '2023',
      degreeType: 'General',
      practiceType: 'Private',
      nationalId: '000000000000',
      trustScore: 35,
      verificationStatus: 'rejected',
      profileStatus: 'incomplete'
    }
  });

  await prisma.verificationResult.upsert({
    where: { userId: suspect.id },
    update: {},
    create: {
      userId: suspect.id,
      licenseValid: false,
      anomalies: JSON.stringify(['POTENTIAL_FRAUD_DETECTED', 'ID_NAME_MISMATCH']),
      score: 35,
      status: 'REJECTED',
      forensicData: JSON.stringify({
        isAuthentic: false,
        confidence: 0.32,
        riskLevel: 'HIGH',
        decision: 'REJECT',
        fraudSignals: ["LOW_TEXT_QUALITY", "LAYOUT_INCONSISTENT", "NO_STAMP", "SUSPICIOUS_IMAGE"],
        weakPointsInSystem: [
          "Image appears to be a digital manipulation of an existing template.",
          "Official ministry keywords are misspelled or missing.",
          "Metadata suggests the image was edited in Adobe Photoshop."
        ],
        analysis: {
          textConsistency: 0.20,
          layoutConsistency: 0.40,
          stampPresence: 0.10,
          tamperingRisk: 0.95
        }
      })
    }
  });

  console.log('✅ Demo users created successfully!');
  console.log('--------------------------------------------------');
  console.log('Admin Login: admin@docauth.dz / password123');
  console.log('Valid User: sarah@clinic.dz / password123');
  console.log('Suspect User: suspect@fake.dz / password123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
