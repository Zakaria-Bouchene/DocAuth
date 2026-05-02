"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, LogOut, FileText } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
    fetchUser();
  }, [router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("document", file);
    formData.append("type", "MEDICAL_LICENSE");
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);

    try {
      await axios.post("http://localhost:3001/api/verify", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      // Refresh user data
      const res = await axios.get("http://localhost:3001/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setFile(null);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const result = user.verificationResults;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> DocAuth
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Dr. {user.name}</span>
          <button onClick={handleLogout} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Status Column */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-800 mb-4">Verification Status</h2>
            
            {!result ? (
              <div className="flex flex-col items-center p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <AlertTriangle className="text-slate-400 mb-2" size={32} />
                <p className="text-slate-600 font-medium">Not Submitted</p>
                <p className="text-xs text-slate-500 mt-1">Please upload your medical license.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  result.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-800' :
                  result.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {result.status === 'APPROVED' && <CheckCircle size={28} className="text-green-600" />}
                  {result.status === 'PENDING' && <AlertTriangle size={28} className="text-yellow-600" />}
                  {result.status === 'REJECTED' && <XCircle size={28} className="text-red-600" />}
                  
                  <div>
                    <p className="text-sm font-bold uppercase">{result.status}</p>
                    <p className="text-xs opacity-80">Final Trust Score: {result.score}/100</p>
                  </div>
                </div>

                {user.documents[0] && user.documents[0].extractedData && (
                  <div className="mt-4 space-y-4">
                    {(() => {
                      const ex = JSON.parse(user.documents[0].extractedData.jsonData);
                      return (
                        <>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                            <h3 className="font-bold text-slate-800 mb-2">Extracted Data</h3>
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="font-semibold">License:</span> {ex.license_number || 'N/A'}</div>
                              <div><span className="font-semibold">Specialty:</span> {ex.specialty || 'N/A'}</div>
                              <div><span className="font-semibold">Issued:</span> {ex.issue_date || 'N/A'}</div>
                              <div><span className="font-semibold">Expires:</span> {ex.expiry_date || 'N/A'}</div>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                            <h3 className="font-bold text-slate-800 mb-2">Anomaly Detection Tests</h3>
                            <ul className="space-y-1">
                              <li className="flex justify-between">
                                <span>Name Mismatch:</span> 
                                <span className={ex.anomalyTests?.nameMismatch ? "text-red-600 font-bold" : "text-green-600"}>{ex.anomalyTests?.nameMismatch ? "FAIL" : "PASS"}</span>
                              </li>
                              <li className="flex justify-between">
                                <span>Missing Data:</span> 
                                <span className={ex.anomalyTests?.missingData ? "text-red-600 font-bold" : "text-green-600"}>{ex.anomalyTests?.missingData ? "FAIL" : "PASS"}</span>
                              </li>
                              <li className="flex justify-between">
                                <span>Expired Document:</span> 
                                <span className={ex.anomalyTests?.expired ? "text-red-600 font-bold" : "text-green-600"}>{ex.anomalyTests?.expired ? "FAIL" : "PASS"}</span>
                              </li>
                              <li className="flex justify-between">
                                <span>Duplicate License:</span> 
                                <span className={ex.anomalyTests?.duplicate ? "text-red-600 font-bold" : "text-green-600"}>{ex.anomalyTests?.duplicate ? "FAIL" : "PASS"}</span>
                              </li>
                            </ul>
                          </div>

                          {ex.scoreBreakdown && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                              <h3 className="font-bold text-slate-800 mb-2">Score Breakdown</h3>
                              <ul className="space-y-1">
                                <li className="flex justify-between"><span>Valid License API Check:</span> <span>+{ex.scoreBreakdown.validLicense}</span></li>
                                <li className="flex justify-between"><span>Name Match OCR:</span> <span>+{ex.scoreBreakdown.matchingNames}</span></li>
                                <li className="flex justify-between"><span>Valid Dates:</span> <span>+{ex.scoreBreakdown.validDates}</span></li>
                                <li className="flex justify-between"><span>No Anomalies Bonus:</span> <span>+{ex.scoreBreakdown.noAnomalies}</span></li>
                                {ex.scoreBreakdown.deductions < 0 && (
                                  <li className="flex justify-between text-red-600 font-medium border-t border-red-200 pt-1 mt-1">
                                    <span>Anomaly Deductions:</span> <span>{ex.scoreBreakdown.deductions}</span>
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upload & History Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-800 mb-4">Upload Documents</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name (on document)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name (on document)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors bg-white ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept="image/*,.pdf"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                  <UploadCloud className={`mb-2 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} size={40} />
                  <span className="text-sm font-medium text-blue-600">Click to browse or drag & drop</span>
                  <span className="text-xs text-slate-500 mt-1">Images up to 10MB</span>
                </label>
              </div>
              
              {file && (
                <div className="text-sm text-slate-700 bg-slate-100 p-3 rounded-lg flex justify-between items-center">
                  <span>{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-slate-500 hover:text-red-500">
                    <XCircle size={16} />
                  </button>
                </div>
              )}

              <button 
                disabled={!file || uploading} 
                className="w-full py-3 bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
              >
                {uploading ? 'Processing...' : 'Submit Document'}
              </button>
              
              <p className="text-xs text-slate-500 mt-4 italic">
                * Our AI engine will run real OCR on your document to verify that your first and last name match exactly.
              </p>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-800 mb-4">Your Documents</h2>
            {user.documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {user.documents.map((doc: any) => (
                  <div key={doc.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <FileText className="text-slate-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{doc.type}</p>
                        <p className="text-xs text-slate-400">{doc.fileUrl}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
