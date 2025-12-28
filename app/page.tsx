"use client";
import React, { useState, useMemo } from 'react';
import { BarChart3, Clock, AlertTriangle, Loader2, UploadCloud, RefreshCw, CheckCircle, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';


interface AttendanceRecord {
  date: string;
  dayName: string;
  inTime: string;
  outTime: string;
  expectedHours: number;
  workedHours: number;
  isLeave: boolean;
}

interface AnalysisResult {
  employeeName: string;
  totalExpected: number;
  totalWorked: number;
  leavesTaken: number;
  productivity: string;
  records: AttendanceRecord[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- NEW: State for Month Filter ---
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setData(json.data);
        setSelectedMonth(''); // Reset filter on new upload
      } else {
        setError(json.error || "Failed to process file");
      }
    } catch (err) {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Filter Logic & Recalculation ---
  const { filteredRecords, stats } = useMemo(() => {
    if (!data) return { filteredRecords: [], stats: null };

    // 1. Filter the records based on selection
    const records = data.records.filter(r => {
      if (!selectedMonth) return true;
      return r.date.startsWith(selectedMonth); // e.g., "2024-12"
    });

    // 2. Recalculate Stats for the selected view
    let worked = 0;
    let expected = 0;
    let leaves = 0;

    records.forEach(r => {
      worked += r.workedHours;
      expected += r.expectedHours;
      if (r.isLeave) leaves++;
    });

    const productivity = expected > 0 ? ((worked / expected) * 100).toFixed(1) : "0.0";

    return { 
      filteredRecords: records, 
      stats: { worked, expected, leaves, productivity } 
    };
  }, [data, selectedMonth]);


  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Productivity Analyzer</h1>
          </div>
          
        </div>

        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

       
        {!data && (
          <div className="bg-white p-16 rounded-2xl shadow-sm border-2 border-dashed border-slate-300 text-center hover:border-blue-400 transition-colors">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              {loading ? (
                <Loader2 className="text-blue-600 animate-spin" size={40} />
              ) : (
                <UploadCloud className="text-blue-600" size={40} />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Attendance Sheet</h2>
            <p className="text-slate-500 mb-6">Supported format: .xlsx (Excel)</p>
            
            <div className="flex flex-col items-center gap-4">
              <input 
                type="file" 
                accept=".xlsx"
                onChange={(e) => {
                  setError(null);
                  if (e.target.files) setFile(e.target.files[0]);
                }}
                className="file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-sm text-slate-500"
              />
              <button 
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
              >
                {loading ? "Analyzing..." : "Process Data"}
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Results */}
        {data && stats && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Report For</p>
                <h2 className="text-2xl font-bold text-slate-900">{data.employeeName}</h2>
              </div>
              
              <div className="flex items-center gap-3">
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                    <Filter size={16} className="text-slate-400"/>
                    <span className="text-sm font-medium text-slate-600">Month:</span>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                    />
                </div>

                <button 
                  onClick={() => {setData(null); setFile(null); setError(null);}} 
                  className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium px-3 py-2 border border-transparent hover:bg-blue-50 rounded-lg"
                >
                  <RefreshCw size={16} /> New File
                </button>
              </div>
            </div>

            {/* Stats Grid (Recalculated) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard 
                label="Productivity Score" 
                value={`${stats.productivity}%`} 
                icon={<BarChart3 className="text-blue-600" />} 
              />
              <StatsCard 
                label="Leaves Taken" 
                value={`${stats.leaves}`} 
                icon={<AlertTriangle className={stats.leaves > 2 ? "text-red-500" : "text-orange-500"} />} 
                alert={stats.leaves > 2}
              />
              <StatsCard 
                label="Total Worked Hours" 
                value={stats.worked.toFixed(1)} 
                icon={<Clock className="text-green-600" />} 
              />
              <StatsCard 
                label="Target Hours" 
                value={stats.expected.toString()} 
                icon={<CheckCircle className="text-slate-400" />} 
              />
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-800">Performance Trend {selectedMonth ? `(${selectedMonth})` : '(All Time)'}</h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRecords} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => new Date(d).getDate().toString()} 
                      axisLine={false} 
                      tickLine={false}
                      dy={10}
                      tick={{fill: '#64748b'}}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b'}}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <ReferenceLine y={8.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                    <Bar dataKey="workedHours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Day Type</th>
                      <th className="p-4">Check In</th>
                      <th className="p-4">Check Out</th>
                      <th className="p-4">Hours</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((r, i) => (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${r.isLeave && r.dayName !== 'Sunday' ? "bg-red-50/50" : ""}`}>
                          <td className="p-4 font-medium text-slate-700">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="p-4 text-slate-600">{r.dayName}</td>
                          <td className="p-4 font-mono text-slate-500">{r.inTime}</td>
                          <td className="p-4 font-mono text-slate-500">{r.outTime}</td>
                          <td className="p-4 font-bold text-slate-800">{r.workedHours > 0 ? r.workedHours : '-'}</td>
                          <td className="p-4">
                            <StatusBadge isLeave={r.isLeave} dayName={r.dayName} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No records found for the selected month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components
function StatsCard({ label, value, icon, alert = false }: { label: string, value: string, icon: React.ReactNode, alert?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-3 mt-2">
        <div className={`p-2 rounded-lg ${alert ? 'bg-red-50' : 'bg-slate-50'}`}>{icon}</div>
        <span className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ isLeave, dayName }: { isLeave: boolean, dayName: string }) {
  if (dayName === 'Sunday') return <span className="text-slate-400 font-medium px-2 py-1 rounded bg-slate-100 text-xs">Holiday</span>;
  if (isLeave) return <span className="text-red-700 font-medium px-2 py-1 rounded bg-red-100 text-xs">Absent / Leave</span>;
  return <span className="text-green-700 font-medium px-2 py-1 rounded bg-green-100 text-xs">Present</span>;
}