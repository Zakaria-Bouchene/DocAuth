import Link from "next/link";
import { ShieldCheck, Stethoscope, FileCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
            <ShieldCheck size={48} />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          DocAuth Verification
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          The trusted practitioner onboarding and verification system. Fast, secure, and accurate credential checks for modern healthcare platforms.
        </p>

        <div className="flex items-center justify-center gap-4 pt-8">
          <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all">
            Practitioner Login
          </Link>
          <Link href="/register" className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium shadow-sm transition-all">
            Register Account
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <Stethoscope className="text-blue-500 mb-4" size={32} />
            <h3 className="text-lg font-semibold mb-2">Automated Checks</h3>
            <p className="text-slate-500 text-sm">Instantly verify medical licenses against authoritative databases.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <FileCheck className="text-blue-500 mb-4" size={32} />
            <h3 className="text-lg font-semibold mb-2">Smart OCR</h3>
            <p className="text-slate-500 text-sm">Extract data accurately from IDs and diplomas with AI-powered OCR.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <ShieldCheck className="text-blue-500 mb-4" size={32} />
            <h3 className="text-lg font-semibold mb-2">Fraud Detection</h3>
            <p className="text-slate-500 text-sm">Anomaly detection identifies mismatches and expired documents.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
