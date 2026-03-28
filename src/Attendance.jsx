import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance({ user }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('daily');
    const [loading, setLoading] = useState(true);

    // রোল চেক করার লজিক একদম সহজ করে দিলাম
    const userRole = user?.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'manager' || user?.id?.toLowerCase() === 'admin';

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
                    query = query.eq('date', today);
                } else if (selectedEmp) {
                    query = query.eq('emp_id', selectedEmp);
                } else {
                    // ডিফল্টভাবে আজকের সব ডাটা দেখাবে
                    query = query.eq('date', today);
                }
            } else {
                // এমপ্লয়ীর নিজের এই মাসের ডাটা
                const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
                query = query.eq('emp_id', user.emp_id).gte('date', firstDay);
            }

            const { data } = await query.order('date', { ascending: false });
            setLogs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Attendance Analytics</h1>

            {/* --- ADMIN FILTERS (এখানেই সমস্যা ছিল, এখন ঠিক আসবে) --- */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                        <button 
                            onClick={() => { setViewMode('daily'); setSelectedEmp(''); }} 
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}
                        >
                            Daily Report
                        </button>
                        <button 
                            onClick={() => setViewMode('individual')} 
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}
                        >
                            Employee History
                        </button>
                    </div>

                    {viewMode === 'individual' && (
                        <select 
                            value={selectedEmp}
                            onChange={(e) => setSelectedEmp(e.target.value)}
                            className="w-full md:w-64 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-slate-950"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.emp_id} value={emp.emp_id}>{emp.name} ({emp.emp_id})</option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* --- TABLE --- */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
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
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-200 uppercase tracking-widest animate-pulse">Searching Records...</td></tr>
                        ) : logs.length > 0 ? (
                            logs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 font-bold group">
                                    <td className="p-8">
                                        <p className="text-xs text-slate-900 uppercase">
                                            {isAdmin && viewMode === 'daily' ? log.name : log.date}
                                        </p>
                                        <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">{log.emp_id}</p>
                                    </td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_in}</td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_out || '--:--'}</td>
                                    <td className="p-8 text-right">
                                        <span className={`text-[8px] font-black px-4 py-1.5 rounded-lg uppercase ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                            {log.time_out ? 'Completed' : 'Active'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest italic">Data not synced or empty.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
