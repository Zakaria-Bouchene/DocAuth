"use client";

import Link from "next/link";
import { ShieldCheck, Stethoscope, FileCheck, Fingerprint, Activity, Lock, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white selection:bg-blue-500/30 overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <header className="max-w-7xl mx-auto px-8 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-xl shadow-blue-900/20">
            <ShieldCheck size={28} />
          </div>
          <span className="text-xl font-black tracking-tighter">DocAuth <span className="text-blue-500">Forensics</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Sign In</Link>
          <Link href="/register" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95">
            Get Verified
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 pt-20 pb-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Strict Forensic Mode Active</span>
            </div>
            
            <h1 className="text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
              The Gold Standard for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Practitioner Trust.</span>
            </h1>
            
            <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
              DocAuth leverages advanced Forensic AI to verify medical credentials with 99.9% accuracy. Built specifically for the rigors of Algerian healthcare digital sovereignty.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/register" className="group px-8 py-5 bg-white text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-xl shadow-white/5">
                Start Onboarding <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0f1d] bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64+i)}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-500">Trusted by <span className="text-white">500+</span> Professionals</span>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Visual Representation of Scanning */}
            <div className="relative bg-slate-900/50 rounded-[40px] border border-white/10 p-4 shadow-2xl backdrop-blur-xl">
              <div className="aspect-[4/3] rounded-[30px] bg-slate-800 overflow-hidden relative border border-white/5">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-40 grayscale" />
                {/* Scanning Line Animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-scan z-20" />
                
                {/* Forensic Overlays */}
                <div className="absolute top-10 left-10 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase text-blue-400">Fingerprint Match</span>
                  </div>
                  <div className="text-xs font-bold text-white">98.4% Confidence</div>
                </div>

                <div className="absolute bottom-10 right-10 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 animate-fade-in delay-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-green-400" />
                    <span className="text-[10px] font-black uppercase text-green-400">Signal Stability</span>
                  </div>
                  <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-40">
          <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all hover:border-white/20">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
              <Stethoscope size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">AI Clinical Analysis</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Advanced parsing of medical diplomas and clinical certificates with 100% data integrity.</p>
          </div>
          <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all hover:border-white/20">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
              <FileCheck size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Forensic Imaging</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Detects ELA (Error Level Analysis) and layout anomalies to prevent digital tampering.</p>
          </div>
          <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all hover:border-white/20">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
              <Lock size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Audit Transparency</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Immutable blockchain-anchored audit logs for every verification event in the system.</p>
          </div>
        </div>
      </div>
      
      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-white/5 text-center text-slate-600 text-xs font-bold tracking-widest uppercase">
        © 2026 DocAuth Forensics • Built for Algerian Healthcare Excellence
      </footer>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </main>
  );
}
