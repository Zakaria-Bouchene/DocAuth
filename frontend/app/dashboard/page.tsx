"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { 
  UploadCloud, CheckCircle, AlertTriangle, XCircle, 
  LogOut, FileText, User as UserIcon, Shield, 
  GraduationCap, ClipboardCheck, Building2, MapPin, Search
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState("ID_CARD");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const fetchUser = async () => {
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
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("document", file);
    formData.append("type", uploadType);

    try {
      await axios.post("http://localhost:3001/api/verify", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      await fetchUser();
      setFile(null);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  // Determine required documents
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

  if (user && user.country !== 'Algeria') {
    requiredDocs.push({ type: 'EQUIVALENCE_CERT', label: 'Equivalence Certificate', icon: ClipboardCheck });
  }

  if (user?.practiceType === 'Private') {
    requiredDocs.push({ type: 'PRACTICE_AUTHORIZATION', label: 'Practice Authorization', icon: MapPin });
  }

  const uploadedTypes = user?.documents.map((d: any) => d.type) || [];
  const missingDocs = requiredDocs.filter(rd => !uploadedTypes.includes(rd.type));

  // Default upload type to first missing
  useEffect(() => {
    if (missingDocs.length > 0 && !missingDocs.find(m => m.type === uploadType)) {
        setUploadType(missingDocs[0].type);
    }
  }, [missingDocs, uploadType]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-medium">Loading Trust Engine...</div>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 px-8 py-4 flex justify-between items-center">
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
          {/* Trust Score Card */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Shield size={120} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" /> Trust Score
            </h2>
            
            <div className="flex flex-col items-center justify-center py-6">
               <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                    <circle 
                      className="text-blue-600 transition-all duration-1000 ease-out" 
                      strokeWidth="8" 
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * user.trustScore) / 100}
                      strokeLinecap="round" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="58" cx="64" cy="64" 
                    />
                  </svg>
                  <span className="absolute text-3xl font-black text-slate-800">{user.trustScore}</span>
               </div>
               <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Strength</p>
            </div>

            <div className={`mt-6 p-4 rounded-2xl border text-center ${
              user.verificationStatus === 'verified' ? 'bg-green-50 border-green-200 text-green-700' :
              user.verificationStatus === 'pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
              user.verificationStatus === 'review_required' ? 'bg-orange-50 border-orange-200 text-orange-700' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p className="text-xs font-black uppercase tracking-tighter mb-1">Status: {user.verificationStatus}</p>
              <p className="text-[10px] font-medium leading-tight opacity-80">
                {user.verificationStatus === 'verified' ? 'Credentials verified successfully.' : 'Additional documents or review required.'}
              </p>
            </div>
          </div>

          {/* Profile Quick Info */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Profile Overview</h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <UserIcon size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">National ID</p>
                    <p className="text-sm font-medium text-slate-700">{user.nationalId || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Practice Type</p>
                    <p className="text-sm font-medium text-slate-700">{user.practiceType} Sector</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Wilaya</p>
                    <p className="text-sm font-medium text-slate-700">{user.wilaya}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Verification Flow */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Progress / Missing Docs */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 mb-6">Verification Progress</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               {requiredDocs.map((rd, i) => {
                 const isDone = uploadedTypes.includes(rd.type);
                 return (
                   <div key={i} className={`p-4 rounded-2xl border transition-all ${isDone ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <rd.icon size={20} className={isDone ? 'text-blue-600' : 'text-slate-400'} />
                        {isDone ? <CheckCircle size={16} className="text-blue-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200" />}
                      </div>
                      <p className={`text-xs font-bold ${isDone ? 'text-blue-900' : 'text-slate-500'}`}>{rd.label}</p>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-blue-50 border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 mb-2">Add Document</h2>
            <p className="text-sm text-slate-500 mb-6">Upload credentials to increase your trust score.</p>
            
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {missingDocs.map((md) => (
                  <button 
                    key={md.type}
                    type="button"
                    onClick={() => setUploadType(md.type)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${uploadType === md.type ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {md.label}
                  </button>
                ))}
                {missingDocs.length === 0 && (
                  <p className="text-xs text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl border border-green-100">All required documents submitted!</p>
                )}
              </div>

              <div 
                className={`group relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept="image/*"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud size={32} />
                  </div>
                  <span className="text-sm font-black text-slate-800">Select {requiredDocs.find(r => r.type === uploadType)?.label}</span>
                  <span className="text-xs text-slate-400 mt-2 font-medium">Drag and drop or click to browse</span>
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-500" size={20} />
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                    <XCircle size={18} />
                  </button>
                </div>
              )}

              <button 
                disabled={!file || uploading} 
                className="w-full py-4 bg-slate-900 disabled:bg-slate-200 hover:bg-blue-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing Document...
                  </div>
                ) : 'Confirm and Upload'}
              </button>
            </form>
          </div>

          {/* Verification Logs */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Search size={20} className="text-blue-600" /> Verification Logs
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
                        <p className="text-xs font-black text-slate-800">{log.checkType}</p>
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
