"use client";
import React, { useState } from 'react';
import { FileSpreadsheet, CheckCircle, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();
    
    if (json.success) setData(json.data);
    else alert("Error processing file");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-900">Productivity Analyzer</h1>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Internship Task</span>
        </div>

        {/* Upload Box */}
        {!data && (
          <div className="bg-white p-12 rounded-2xl shadow-sm border-2 border-dashed border-gray-300 text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="text-blue-600" size={32} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Upload Attendance Excel</h2>
            <input 
              type="file" 
              accept=".xlsx"
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              className="block w-full max-w-xs mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
            />
            <button 
              onClick={handleUpload}
              disabled={!file || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Analyze Now"}
            </button>
          </div>
        )}

        {/* Dashboard Results */}
        {data && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Productivity</p>
                <div className="flex items-center gap-2 mt-1">
                  <BarChart3 className="text-blue-600" />
                  <span className="text-2xl font-bold">{data.productivity}%</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Leaves Used</p>
                <div className="flex items-center gap-2 mt-1">
                  <AlertTriangle className={data.leavesTaken > 2 ? "text-red-500" : "text-orange-500"} />
                  <span className={`text-2xl font-bold ${data.leavesTaken > 2 ? "text-red-600" : "text-gray-800"}`}>
                    {data.leavesTaken} / 2
                  </span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Worked Hours</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="text-green-600" />
                  <span className="text-2xl font-bold">{data.totalWorked.toFixed(1)}</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Target Hours</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="text-gray-400" />
                  <span className="text-2xl font-bold">{data.totalExpected}</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="font-semibold mb-4">Daily Performance</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.records}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).getDate().toString()} />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={8.5} stroke="red" strokeDasharray="3 3" />
                  <Bar dataKey="workedHours" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">In</th>
                    <th className="p-4">Out</th>
                    <th className="p-4">Worked</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.records.map((r: any, i: number) => (
                    <tr key={i} className={r.isLeave ? "bg-red-50" : ""}>
                      <td className="p-4">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="p-4">{r.dayName}</td>
                      <td className="p-4">{r.inTime}</td>
                      <td className="p-4">{r.outTime}</td>
                      <td className="p-4 font-bold">{r.workedHours}</td>
                      <td className="p-4">
                        {r.isLeave 
                          ? <span className="text-red-600 font-medium">Leave</span> 
                          : <span className="text-green-600 font-medium">Present</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => {setData(null); setFile(null)}} className="text-blue-600 hover:underline w-full text-center">
              Reset / Upload New File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}