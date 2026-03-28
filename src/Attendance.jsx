import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance({ user }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('daily');
    const [loading, setLoading] = useState(true);

    // ১. আপনার স্ক্রিনশট অনুযায়ী রোল চেক (Admin/Manager/user)
    const userRole = user?.role; 
    const isAdmin = userRole === 'Admin' || userRole === 'Manager' || user?.id === 'admin';

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
            // ২. লোকাল টাইম জোন অনুযায়ী সঠিক তারিখ ফরম্যাট
            const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD ফরম্যাট
            let query = supabase.from('attendance').select('*');

            if (isAdmin) {
                if (viewMode === 'daily') {
                    // আজকের দিনের রিপোর্ট
                    query = query.eq('date', today);
                } else if (selectedEmp) {
                    // ড্রপডাউন থেকে সিলেক্ট করা এমপ্লয়ীর হিস্ট্রি
                    query = query.eq('emp_id', selectedEmp);
                } else {
                    // ডিফল্ট: যদি কিছুই সিলেক্ট না থাকে, তবে সবশেষ ৫০টি লগ দেখাবে (যাতে টেবিল ফাঁকা না থাকে)
                    query = query.limit(50);
                }
            } else {
                // এমপ্লয়ীর জন্য চলতি মাসের ডাটা
                const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE');
                query = query.eq('emp_id', user.emp_id).gte('date', firstDay);
            }

            const { data, error } = await query.order('date', { ascending: false }).order('time_in', { ascending: false });
            if (error) throw error;
            setLogs(data || []);
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Attendance Analytics</h1>

            {/* --- ADMIN FILTERS --- */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                        <button 
                            onClick={() => { setViewMode('daily'); setSelectedEmp(''); }} 
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}
                        >
                            Today's Daily
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
                <table className="w-full text-left border-collapse">
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
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-200 uppercase tracking-widest animate-pulse">Syncing Database...</td></tr>
                        ) : logs.length > 0 ? (
                            logs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 font-bold group">
                                    <td className="p-8">
                                        <p className="text-xs text-slate-900 uppercase">
                                            {isAdmin && viewMode === 'daily' ? log.name : new Date(log.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                        </p>
                                        <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">ID: {log.emp_id}</p>
                                    </td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500 italic">{log.time_in}</td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500 italic">{log.time_out || '--:--'}</td>
                                    <td className="p-8 text-right">
                                        <span className={`text-[8px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                            {log.time_out ? 'Completed' : 'On Duty'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest italic">No Records for {viewMode === 'daily' ? 'Today' : 'Selection'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
