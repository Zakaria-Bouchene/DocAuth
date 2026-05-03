# DocAuth - System Architecture

This document provides a detailed overview of the DocAuth verification pipeline and system structure.

## 📐 High-Level Architecture

```mermaid
graph TD
    subgraph "Client Layer (Next.js / TypeScript)"
        PD[Practitioner Dashboard]
        AD[Admin Dashboard]
        UI[UI Components]
    end

    subgraph "API Layer (Express.js / Node.js)"
        Auth[JWT Authentication]
        Upload[Multer File Upload]
        Engine[Verification Engine]
        Forensic[AI Forensic Analyst]
    end

    subgraph "Processing Services"
        Sharp[Sharp Image Processing]
        OCR[Tesseract.js OCR]
        Gemini[Google Gemini 1.5 Flash]
    end

    subgraph "Data & Storage"
        DB[(SQLite / Prisma)]
        FS[Local Filesystem /uploads]
        Audit[Immutable Audit Logs]
        BC[Blockchain Hash Anchoring]
    end

    %% Flow
    PD -->|Upload Docs| Upload
    Upload -->|Save| FS
    Engine -->|Pre-process| Sharp
    Engine -->|Extract Text| OCR
    Engine -->|Analyze Fraud| Forensic
    Forensic -->|Prompt Analysis| Gemini
    Engine -->|Store Results| DB
    AD -->|Review/Approve| DB
    DB --> Audit
    Audit -->|Anchor| BC
```

## 🔄 Verification Workflow

1.  **Ingestion**: Practitioner uploads ID, Degree, and Licenses via the **Practitioner Dashboard**.
2.  **Processing**:
    *   **Sharp**: Normalizes images, detects blur, and generates quality signals.
    *   **Tesseract.js**: Extracts raw text from documents.
3.  **Forensic Analysis**:
    *   **Google Gemini**: Analyzes the OCR text and system signals in **Strict Mode**.
    *   Detects tampering, structural inconsistencies, and missing official Algerian keywords.
4.  **Trust Scoring**:
    *   Calculates a score (0-100) based on identity matching, credential validity, and forensic results.
5.  **Audit Trail**:
    *   Every decision is logged.
    *   Hashes are (mock) anchored to a blockchain for immutable proof.

## 🛡️ Security Model

- **RBAC**: Strict separation between `DOCTOR` and `ADMIN` roles via JWT.
- **Data Integrity**: Prisma ORM ensures relational integrity; Audit logs track every change.
- **AI Sovereignty**: Specialized prompts tailored for Algerian administrative standards.

---
*Last Updated: May 2026*
