"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { 
  LogOut, ShieldAlert, CheckCircle, XCircle, 
  Search, Eye, Activity, FileText, ExternalLink, 
  Database, Lock, Hash, Clock 
} from "lucide-react";

export default function AdminDashboard() {
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("PRACTITIONERS");
  const [filter, setFilter] = useState("ALL");
  const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const router = useRouter();

  const fetchPractitioners = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    try {
      const res = await axios.get("http://localhost:3001/api/admin/practitioners", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPractitioners(res.data);
    } catch (err) {
      router.push("/login");
    }
  };

  const fetchAuditLogs = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:3001/api/admin/audit", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  useEffect(() => {
    fetchPractitioners();
    fetchAuditLogs();
  }, [router]);

  const handleReview = async (id: number, status: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(`http://localhost:3001/api/admin/practitioners/${id}/review`, { 
        status, 
        annotations: adminNote 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPractitioners();
      fetchAuditLogs();
      setSelectedPractitioner(null);
      setAdminNote("");
    } catch (err) {
      console.error("Review failed", err);
    }
  };

  const handleAnchor = async (logId: number) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(`http://localhost:3001/api/admin/anchor/${logId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAuditLogs();
    } catch (err) {
      console.error("Anchoring failed", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const filtered = practitioners.filter(p => filter === "ALL" ? true : p.status === filter);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-blue-400" /> DocAuth Admin
          </h1>
          <nav className="flex gap-4">
            <button 
              onClick={() => setActiveTab("PRACTITIONERS")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "PRACTITIONERS" ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-white"}`}
            >
              Practitioners
            </button>
            <button 
              onClick={() => setActiveTab("AUDIT_LOGS")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "AUDIT_LOGS" ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-white"}`}
            >
              Audit Logs
            </button>
          </nav>
        </div>
        <button onClick={handleLogout} className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium">
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        {activeTab === "PRACTITIONERS" ? (
          <>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Verification Queue</h2>
                <p className="text-slate-500 mt-1">Review and manage healthcare professional credentials.</p>
              </div>
              
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-xs rounded-lg font-bold transition-all ${
                      filter === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-5 font-bold">Practitioner</th>
                    <th className="p-5 font-bold">Trust Score</th>
                    <th className="p-5 font-bold">Status</th>
                    <th className="p-5 font-bold">Anomalies</th>
                    <th className="p-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">No records matching your filter.</td>
                    </tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${p.score >= 80 ? 'bg-green-500' : p.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${p.score}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-bold ${p.score >= 80 ? 'text-green-600' : p.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {p.score}%
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${
                          p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          p.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-wrap gap-1">
                          {p.anomalies.length > 0 ? p.anomalies.map((a: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-bold">
                              {a}
                            </span>
                          )) : <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => setSelectedPractitioner(p)}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 ml-auto shadow-sm"
                        >
                          <Eye size={14} /> Review Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">System Audit Logs</h2>
                <p className="text-slate-500 mt-1">Immutable trail of all security and verification events.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-lg">
                <Database size={14} /> SQL Backend Active
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-5 font-bold">Timestamp</th>
                    <th className="p-5 font-bold">User</th>
                    <th className="p-5 font-bold">Action</th>
                    <th className="p-5 font-bold">Details</th>
                    <th className="p-5 font-bold">Blockchain Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-5 text-xs text-slate-500 font-mono">
                        <Clock size={12} className="inline mr-1 opacity-60" />
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-5">
                        <p className="text-sm font-bold text-slate-800">{log.user?.name || "System"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{log.user?.email || "internal@system"}</p>
                      </td>
                      <td className="p-5">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          log.action.includes('ADMIN') ? 'bg-purple-100 text-purple-700' :
                          log.action === 'UPLOAD' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-5">
                        <p className="text-xs text-slate-600 max-w-xs truncate font-mono">
                          {log.details}
                        </p>
                      </td>
                      <td className="p-5">
                        {log.txHash ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Lock size={14} />
                            <span className="text-[10px] font-mono truncate w-24" title={log.txHash}>{log.txHash}</span>
                            <ExternalLink size={12} className="opacity-50" />
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAnchor(log.id)}
                            className="px-3 py-1 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-blue-600 transition-all flex items-center gap-1"
                          >
                            <Hash size={12} /> Anchor Hash
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Verification Modal (Side-by-Side View) */}
      {selectedPractitioner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-7xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-200">
                  {selectedPractitioner.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedPractitioner.name}</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1">
                    Practitioner ID: #{selectedPractitioner.id} • Registered {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPractitioner(null)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left: Document Image Viewer */}
              <div className="flex-1 bg-slate-200 p-8 overflow-auto flex items-center justify-center border-r border-slate-100">
                {selectedPractitioner.documents.length > 0 ? (
                  <div className="relative group">
                    <img 
                      src={`http://localhost:3001/uploads/${selectedPractitioner.documents[0].fileUrl}`} 
                      alt="License Document"
                      className="max-w-full h-auto rounded-xl shadow-2xl border-8 border-white transition-transform group-hover:scale-[1.01]"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-lg text-[10px] font-bold text-slate-800 flex items-center gap-2">
                      <Activity size={12} className="text-blue-600" /> ORIGINAL DOCUMENT
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-2">
                    <FileText size={48} className="opacity-20" />
                    <p className="font-medium">No document image available</p>
                  </div>
                )}
              </div>

              {/* Right: Data & Annotation Panel */}
              <div className="w-[480px] bg-white overflow-y-auto p-8 flex flex-col border-l border-slate-100">
                <div className="space-y-8">
                  {/* Extracted Data Section */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                        <Database size={16} className="text-blue-600" /> OCR EXTRACTED DATA
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded">CONFIDENCE: 98%</span>
                    </div>
                    {selectedPractitioner.documents[0]?.extractedData ? (
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        {Object.entries(selectedPractitioner.documents[0].extractedData).map(([key, val]: any) => (
                          typeof val !== 'object' && key !== 'extractedText' && (
                            <div key={key} className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-slate-400">{key.replace('_', ' ')}</p>
                              <p className="text-xs font-bold text-slate-800">{val || 'N/A'}</p>
                            </div>
                          )
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400 italic">No extraction data available.</p>}
                  </section>

                  {/* Anomaly & Risk Profile */}
                  <section>
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                      <Activity size={16} className="text-red-500" /> RISK PROFILE
                    </h4>
                    <div className="space-y-3">
                      {selectedPractitioner.documents[0]?.extractedData?.anomalyTests ? (
                        Object.entries(selectedPractitioner.documents[0].extractedData.anomalyTests).map(([test, failed]: any) => (
                          <div key={test} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-slate-600">{test.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                            {failed ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                                <XCircle size={10} /> FAILED
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                <CheckCircle size={10} /> PASSED
                              </span>
                            )}
                          </div>
                        ))
                      ) : <p className="text-xs text-slate-400">Loading risk data...</p>}
                    </div>
                  </section>

                  {/* Admin Annotations */}
                  <section className="flex-1 flex flex-col">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                      <Activity size={16} className="text-orange-500" /> ADMIN ANNOTATIONS
                    </h4>
                    <textarea 
                      placeholder="Enter review notes or flag specific regions..."
                      className="w-full flex-1 min-h-[120px] p-4 text-xs font-medium bg-orange-50/30 border border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none text-slate-700"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                    />
                  </section>
                </div>

                {/* Final Decision Buttons */}
                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleReview(selectedPractitioner.id, 'REJECTED')}
                    className="py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <XCircle size={18} /> REJECT
                  </button>
                  <button 
                    onClick={() => handleReview(selectedPractitioner.id, 'APPROVED')}
                    className="py-4 bg-green-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle size={18} /> APPROVE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
