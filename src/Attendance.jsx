import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance({ user }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'individual'
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        if (isAdmin) fetchEmployees();
        fetchLogs();
    }, [selectedEmp, viewMode, user]);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('employees').select('emp_id, name');
        setEmployees(data || []);
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const today = new Date().toLocaleDateString('en-CA');
            let query = supabase.from('attendance').select('*');

            if (isAdmin) {
                if (viewMode === 'daily') {
                    // ১. আজকের দিনে কে কে উপস্থিত
                    query = query.eq('date', today);
                } else if (selectedEmp) {
                    // ২. ড্রপডাউন থেকে সিলেক্ট করা এমপ্লয়ীর পুরো মাসের ডাটা
                    query = query.eq('emp_id', selectedEmp);
                } else {
                    // কিছুই সিলেক্ট না থাকলে লেটেস্ট সব ডাটা
                    query = query.limit(50);
                }
            } else {
                // সাধারণ এমপ্লয়ী শুধু নিজের এই মাসের ডাটা দেখবে
                const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
                query = query.eq('emp_id', user.emp_id).gte('date', firstDay);
            }

            const { data, error } = await query.order('date', { ascending: false }).order('time_in', { ascending: false });
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Attendance Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Attendance Analytics</h1>

            {/* --- ADMIN FILTERS --- */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto overflow-hidden">
                        <button 
                            onClick={() => { setViewMode('daily'); setSelectedEmp(''); }} 
                            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Daily Report
                        </button>
                        <button 
                            onClick={() => setViewMode('individual')} 
                            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Employee History
                        </button>
                    </div>

                    {viewMode === 'individual' && (
                        <select 
                            value={selectedEmp}
                            onChange={(e) => setSelectedEmp(e.target.value)}
                            className="w-full md:w-64 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-slate-950 outline-none"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.emp_id} value={emp.emp_id}>{emp.name} ({emp.emp_id})</option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* --- DATA TABLE --- */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                            <tr>
                                <th className="p-8">Details</th>
                                <th className="p-8">Time In</th>
                                <th className="p-8">Time Out</th>
                                <th className="p-8 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-200 uppercase tracking-widest animate-pulse">Syncing logs...</td></tr>
                            ) : logs.length > 0 ? (
                                logs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-all font-bold group">
                                        <td className="p-8">
                                            <p className="text-xs text-slate-900 uppercase">
                                                {isAdmin && viewMode === 'daily' ? log.name : new Date(log.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                            </p>
                                            <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">ID: {log.emp_id}</p>
                                        </td>
                                        <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_in || '--:--'}</td>
                                        <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_out || '--:--'}</td>
                                        <td className="p-8 text-right">
                                            <span className={`text-[8px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                                {log.time_out ? 'Completed' : 'On Duty'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest italic">No records found for this selection</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
