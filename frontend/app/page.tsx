import Link from "next/link";
import { ShieldCheck, Stethoscope, FileCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <ShieldCheck className="text-blue-600 w-16 h-16" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900">DocAuth Verification</h1>
        <p className="text-lg text-slate-600">
          Secure and automated forensic verification for healthcare practitioners in Algeria.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <Stethoscope className="text-blue-500 mb-4" />
            <h3 className="font-bold">Practitioner Onboarding</h3>
            <p className="text-sm text-slate-500">Fast and secure registration for medical professionals.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <FileCheck className="text-green-500 mb-4" />
            <h3 className="font-bold">Document Forensics</h3>
            <p className="text-sm text-slate-500">AI-powered analysis of diplomas and licenses.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <ShieldCheck className="text-purple-500 mb-4" />
            <h3 className="font-bold">Fraud Prevention</h3>
            <p className="text-sm text-slate-500">Multi-layered security to ensure data integrity.</p>
          </div>
        </div>
        <div className="flex justify-center gap-4 pt-8">
          <Link href="/login" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors">
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
