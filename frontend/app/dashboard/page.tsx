"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { 
  UploadCloud, CheckCircle, AlertTriangle, XCircle, 
  LogOut, FileText, User as UserIcon, Shield, 
  GraduationCap, ClipboardCheck, Building2, MapPin, Search, 
  ArrowRight, Loader2, RefreshCw
} from "lucide-react";

// --- Sub-Component: Individual Upload Block ---
function DocumentUploadBlock({ 
  type, 
  label, 
  icon: Icon, 
  isUploaded, 
  index,
  total,
  onUpload 
}: { 
  type: string, 
  label: string, 
  icon: any, 
  isUploaded: boolean, 
  index: number,
  total: number,
  onUpload: (file: File, type: string) => Promise<void> 
}) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await onUpload(file, type);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-6 relative">
      {/* Stepper Connector Line */}
      {index < total - 1 && (
        <div className={`absolute left-[23px] top-12 bottom-0 w-0.5 ${isUploaded ? 'bg-green-500' : 'bg-slate-100'}`} />
      )}
      
      {/* Step Number Circle */}
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
          isUploaded 
            ? 'bg-green-600 text-white shadow-green-100' 
            : 'bg-white border-2 border-slate-100 text-slate-400'
        }`}>
          {isUploaded ? <CheckCircle size={20} /> : index + 1}
        </div>
      </div>

      {/* Upload Content Card */}
      <div className={`flex-1 p-6 rounded-[2rem] border-2 transition-all mb-8 ${
        isUploaded 
          ? 'bg-green-50/50 border-green-200' 
          : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
              <Icon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{label}</h3>
              <p className="text-[10px] text-slate-400 leading-tight">Please upload a clear scan or photo of your {label}.</p>
            </div>
          </div>
          {isUploaded ? (
            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-green-100 shadow-sm">Verified</span>
          ) : (
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Pending</span>
          )}
        </div>

        <div 
          className={`relative border-2 border-dashed rounded-2xl p-4 flex items-center justify-center transition-all ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsDragging(false); 
            if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); 
          }}
        >
          <input 
            type="file" 
            id={`file-${type}`} 
            className="hidden"
            onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0]); }}
            accept="image/*,.pdf"
          />
          <label htmlFor={`file-${type}`} className="cursor-pointer flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              {uploading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <UploadCloud size={18} />
              )}
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold text-blue-600 uppercase block">
                {isUploaded ? 'Replace Current File' : 'Choose File to Upload'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">Supports JPG, PNG or PDF (Max 10MB)</span>
            </div>
            <ArrowRight size={16} className="text-slate-300" />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    try {
      const res = await axios.get("http://localhost:3001/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem("token");
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpload = async (file: File, type: string) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("document", file);
    formData.append("type", type);

    try {
      await axios.post("http://localhost:3001/api/upload-document", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      await fetchUser();
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const startVerification = async () => {
    setVerifying(true);
    setProgress(0);
    const token = localStorage.getItem("token");
    
    // Simulated steps for progress visualization
    const steps = [
      { id: 'ID_OCR', label: 'Identity Verification', weight: 25 },
      { id: 'DEGREE_OCR', label: 'Degree Validation', weight: 25 },
      { id: 'CROSS_VAL', label: 'Cross Validation', weight: 25 },
      { id: 'SCORING', label: 'Trust Calculation', weight: 25 }
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        setActiveStep(steps[i].id);
        // Artificial delay for better UX
        await new Promise(r => setTimeout(r, 1200));
        setProgress(prev => prev + steps[i].weight);
      }

      await axios.post("http://localhost:3001/api/verify-full", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchUser();
      setProgress(100);
      setActiveStep('COMPLETED');
    } catch (err) {
      console.error("Verification failed", err);
      setActiveStep('FAILED');
    } finally {
      setTimeout(() => {
        setVerifying(false);
        setActiveStep(null);
        setProgress(0);
      }, 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  // Determine required documents (Moved before returns for consistency)
  const requiredDocs = user ? [
    { type: 'ID_CARD', label: 'National ID', icon: UserIcon },
    { type: 'SELFIE', label: 'Selfie with ID', icon: UserIcon },
    { type: 'DEGREE', label: 'Medical Diploma', icon: GraduationCap },
    { type: 'REGISTRATION', label: 'Council Registration', icon: ClipboardCheck },
    { type: 'DSP', label: 'DSP License', icon: Building2 },
  ] : [];

  if (user?.degreeType === 'Specialist') {
    requiredDocs.push({ type: 'RESIDENCY_CERT', label: 'Residency Certificate', icon: GraduationCap });
  }

  if (user?.country && user.country !== 'Algeria') {
    requiredDocs.push({ type: 'EQUIVALENCE_CERT', label: 'Equivalence Certificate', icon: ClipboardCheck });
  }

  if (user?.practiceType === 'Private') {
    requiredDocs.push({ type: 'PRACTICE_AUTHORIZATION', label: 'Practice Authorization', icon: MapPin });
  }

  const uploadedTypes = user?.documents.map((d: any) => d.type) || [];
  const allUploaded = requiredDocs.length > 0 && requiredDocs.every(rd => uploadedTypes.includes(rd.type));

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing Trust Engine...</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
            <Shield className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-800">DocAuth <span className="text-blue-600">Trust</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">Dr. {user.name}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{user.specialty}</span>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-red-500">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Profile & Trust Score */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" /> Trust Score
            </h2>
            
            <div className="flex flex-col items-center justify-center py-6">
               <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle className="text-slate-100" strokeWidth="10" stroke="currentColor" fill="transparent" r="64" cx="72" cy="72" />
                    <circle 
                      className="text-blue-600 transition-all duration-1000 ease-out" 
                      strokeWidth="10" 
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * user.trustScore) / 100}
                      strokeLinecap="round" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="64" cx="72" cy="72" 
                    />
                  </svg>
                  <span className="absolute text-4xl font-black text-slate-800">{user.trustScore}</span>
               </div>
               <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification Strength</p>
            </div>

            <div className={`mt-6 p-5 rounded-2xl border text-center transition-all ${
              user.verificationStatus === 'verified' ? 'bg-green-50 border-green-200 text-green-700' :
              user.verificationStatus === 'pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
              user.verificationStatus === 'review_required' ? 'bg-orange-50 border-orange-200 text-orange-700' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p className="text-xs font-black uppercase tracking-tighter mb-1">Status: {user.verificationStatus}</p>
              <p className="text-[10px] font-medium leading-tight opacity-80 uppercase tracking-wider">
                {user.verificationStatus === 'verified' ? 'Credentials verified successfully.' : 'Verification required to access platform.'}
              </p>
            </div>
          </div>

          {/* Verification Progress Section */}
          {(verifying || activeStep) && (
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest">Verification Progress</h2>
                <span className="text-xs font-black text-blue-400">{progress}%</span>
              </div>
              
              <div className="w-full bg-slate-800 h-2 rounded-full mb-8 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-4">
                {[
                  { id: 'ID_OCR', label: 'Identity Verification' },
                  { id: 'DEGREE_OCR', label: 'Degree Validation' },
                  { id: 'CROSS_VAL', label: 'Cross Validation' },
                  { id: 'SCORING', label: 'Trust Calculation' }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {progress > (idx + 1) * 24 || activeStep === 'COMPLETED' ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : activeStep === step.id ? (
                      <Loader2 size={16} className="text-blue-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
                    )}
                    <span className={`text-xs font-bold ${activeStep === step.id ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Standalone Uploads */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="space-y-0">
            {requiredDocs.map((doc, idx) => (
              <DocumentUploadBlock 
                key={doc.type}
                type={doc.type}
                label={doc.label}
                icon={doc.icon}
                index={idx}
                total={requiredDocs.length}
                isUploaded={uploadedTypes.includes(doc.type)}
                onUpload={handleUpload}
              />
            ))}
          </div>

          {/* Process Verification Trigger */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-md">
              <h2 className="text-xl font-black text-slate-800 mb-2">Finalize Verification</h2>
              <p className="text-sm text-slate-500">
                {allUploaded 
                  ? "All required documents are uploaded. You can now run the full verification engine." 
                  : "Please upload all required documents listed above before processing."}
              </p>
            </div>
            
            <div className="relative">
              {!allUploaded && !verifying && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap animate-bounce">
                  Missing Documents
                </div>
              )}
              <button 
                disabled={!allUploaded || verifying}
                onClick={startVerification}
                className={`px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl ${
                  allUploaded && !verifying
                    ? 'bg-blue-600 text-white shadow-blue-200 hover:-translate-y-1 hover:bg-blue-700' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {verifying ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    Process Verification
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Logs */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Search size={20} className="text-blue-600" /> Audit History
            </h2>
            <div className="space-y-3">
              {user.verificationLogs.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium italic">No verification activity recorded yet.</p>
              ) : (
                user.verificationLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${log.result === 'PASS' ? 'bg-green-100 text-green-600' : log.result === 'WARNING' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                        {log.result === 'PASS' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{log.checkType}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    {log.details && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-100">
                        {JSON.parse(log.details).detail || log.result}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
