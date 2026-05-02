"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert, CheckCircle, XCircle, Search, Eye } from "lucide-react";

export default function AdminDashboard() {
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  useEffect(() => {
    fetchPractitioners();
  }, [router]);

  const handleReview = async (id: number, status: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(`http://localhost:3001/api/admin/practitioners/${id}/review`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPractitioners();
    } catch (err) {
      console.error("Review failed", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filtered = practitioners.filter(p => filter === "ALL" ? true : p.status === filter);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldAlert className="text-blue-400" /> Admin Portal
        </h1>
        <button onClick={handleLogout} className="text-slate-300 hover:text-white flex items-center gap-1">
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Verification Queue</h2>
            <p className="text-sm text-slate-500">Review and manage practitioner applications.</p>
          </div>
          
          <div className="flex gap-2">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-medium">Practitioner</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Flags</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No practitioners found.</td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${p.score >= 80 ? 'text-green-600' : p.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.score}/100
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      p.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      p.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.anomalies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.anomalies.map((a: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-medium">
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => toggleExpand(p.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Profile"
                      >
                        <Eye size={20} />
                      </button>
                      {p.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleReview(p.id, 'APPROVED')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button 
                            onClick={() => handleReview(p.id, 'REJECTED')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr className="bg-white border-b border-slate-200">
                    <td colSpan={5} className="p-6 bg-slate-50/50">
                      {p.documents.length > 0 && p.documents[0].extractedData ? (() => {
                        const ex = p.documents[0].extractedData;
                        return (
                          <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-bold text-slate-800 mb-3 text-sm border-b pb-2">OCR Extracted Data</h3>
                              <div className="space-y-2 text-xs text-slate-600">
                                <div><span className="font-semibold text-slate-800">License:</span> {ex.license_number || 'N/A'}</div>
                                <div><span className="font-semibold text-slate-800">Specialty:</span> {ex.specialty || 'N/A'}</div>
                                <div><span className="font-semibold text-slate-800">Issued:</span> {ex.issue_date || 'N/A'}</div>
                                <div><span className="font-semibold text-slate-800">Expires:</span> {ex.expiry_date || 'N/A'}</div>
                                <div><span className="font-semibold text-slate-800">Name Match Score:</span> {ex.matchScore}%</div>
                              </div>
                            </div>

                            <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-bold text-slate-800 mb-3 text-sm border-b pb-2">Anomaly Tests</h3>
                              <ul className="space-y-2 text-xs">
                                <li className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-600">Name Match:</span> 
                                  <span className={ex.anomalyTests?.nameMismatch ? "text-red-600 font-bold" : "text-green-600 font-semibold"}>{ex.anomalyTests?.nameMismatch ? "FAILED" : "PASSED"}</span>
                                </li>
                                <li className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-600">Missing Data:</span> 
                                  <span className={ex.anomalyTests?.missingData ? "text-red-600 font-bold" : "text-green-600 font-semibold"}>{ex.anomalyTests?.missingData ? "FAILED" : "PASSED"}</span>
                                </li>
                                <li className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-600">Expired:</span> 
                                  <span className={ex.anomalyTests?.expired ? "text-red-600 font-bold" : "text-green-600 font-semibold"}>{ex.anomalyTests?.expired ? "FAILED" : "PASSED"}</span>
                                </li>
                                <li className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-600">Duplicate Use:</span> 
                                  <span className={ex.anomalyTests?.duplicate ? "text-red-600 font-bold" : "text-green-600 font-semibold"}>{ex.anomalyTests?.duplicate ? "FAILED" : "PASSED"}</span>
                                </li>
                              </ul>
                            </div>

                            <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-bold text-slate-800 mb-3 text-sm border-b pb-2">Trust Score Engine</h3>
                              {ex.scoreBreakdown ? (
                                <ul className="space-y-2 text-xs">
                                  <li className="flex justify-between text-slate-600"><span>Valid API License:</span> <span className="text-green-600 font-semibold">+{ex.scoreBreakdown.validLicense}</span></li>
                                  <li className="flex justify-between text-slate-600"><span>Name Matches:</span> <span className="text-green-600 font-semibold">+{ex.scoreBreakdown.matchingNames}</span></li>
                                  <li className="flex justify-between text-slate-600"><span>Valid Dates:</span> <span className="text-green-600 font-semibold">+{ex.scoreBreakdown.validDates}</span></li>
                                  <li className="flex justify-between text-slate-600"><span>No Anomalies:</span> <span className="text-green-600 font-semibold">+{ex.scoreBreakdown.noAnomalies}</span></li>
                                  {ex.scoreBreakdown.deductions < 0 && (
                                    <li className="flex justify-between text-red-600 font-bold border-t border-red-100 pt-2 mt-1">
                                      <span>Total Deductions:</span> <span>{ex.scoreBreakdown.deductions}</span>
                                    </li>
                                  )}
                                </ul>
                              ) : (
                                <span className="text-slate-500 text-xs">Score breakdown unavailable.</span>
                              )}
                            </div>
                          </div>
                        );
                      })() : (
                        <p className="text-slate-500 text-sm">No detailed verification data available for this document.</p>
                      )}
                    </td>
                  </tr>
                )}
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
