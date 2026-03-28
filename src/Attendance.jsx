import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance() { // প্রপ্স (user) আর লাগবে না
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('daily');
    const [loading, setLoading] = useState(true);

    // ১. প্রপ্সের ওপর ভরসা না করে সরাসরি মেমোরি থেকে ইউজার বের করা
    const savedUser = JSON.parse(localStorage.getItem('lams_user'));
    const role = savedUser?.role?.toLowerCase() || "";
    const isAdmin = role === 'admin' || role === 'manager' || savedUser?.id === 'admin' || savedUser?.emp_id === 'emp110';

    useEffect(() => {
        if (isAdmin) fetchEmployees();
        fetchLogs();
    }, [selectedEmp, viewMode, isAdmin]);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('employees').select('emp_id, name');
        setEmployees(data || []);
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const today = new Date().toLocaleDateString('sv-SE'); 
            let query = supabase.from('attendance').select('*');

            if (isAdmin) {
                if (viewMode === 'daily') {
                    // আজকের ডাটা না থাকলে জাস্ট লেটেস্ট গুলো দেখাবে যাতে সাদা না লাগে
                    const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today);
                    if (count === 0) { query = query.limit(50); } 
                    else { query = query.eq('date', today); }
                } else if (selectedEmp) {
                    query = query.eq('emp_id', selectedEmp);
                } else {
                    query = query.limit(50);
                }
            } else {
                // এমপ্লয়ীর নিজের আইডি দিয়ে সার্চ
                query = query.eq('emp_id', savedUser?.emp_id);
            }

            const { data } = await query.order('date', { ascending: false }).order('time_in', { ascending: false });
            setLogs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Attendance Analytics</h1>

            {/* Admin Controls */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                        <button onClick={() => { setViewMode('daily'); setSelectedEmp(''); }} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>Daily View</button>
                        <button onClick={() => setViewMode('individual')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>By Employee</button>
                    </div>

                    {viewMode === 'individual' && (
                        <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} className="w-full md:w-64 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm">
                            <option value="">Select Employee</option>
                            {employees.map(emp => <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>)}
                        </select>
                    )}
                </div>
            )}

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                        <tr>
                            <th className="p-8">Details</th>
                            <th className="p-8">Check In</th>
                            <th className="p-8">Check Out</th>
                            <th className="p-8 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-200 uppercase tracking-widest animate-pulse">Syncing logs...</td></tr>
                        ) : logs.length > 0 ? (
                            logs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-all font-bold">
                                    <td className="p-8">
                                        <p className="text-xs text-slate-900 uppercase">{log.name || 'Admin'}</p>
                                        <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">{new Date(log.date).toLocaleDateString('en-GB')} • ID: {log.emp_id}</p>
                                    </td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_in}</td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_out || '--:--'}</td>
                                    <td className="p-8 text-right">
                                        <span className={`text-[8px] font-black px-4 py-1.5 rounded-lg uppercase ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                            {log.time_out ? 'Finished' : 'On Duty'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest italic tracking-tight">No Logs In Database</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
