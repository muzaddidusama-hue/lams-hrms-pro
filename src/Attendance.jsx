import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance({ user }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('daily');
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false); // রোল চেক করার জন্য নতুন স্টেট

    useEffect(() => {
        checkUserRole();
    }, [user]);

    useEffect(() => {
        if (isAdmin) fetchEmployees();
        fetchLogs();
    }, [selectedEmp, viewMode, isAdmin]);

    // ১. ডাটাবেজ থেকে সরাসরি আপনার রোল বের করা (Props-এ ভুল থাকলেও এটা কাজ করবে)
    const checkUserRole = async () => {
        if (!user?.emp_id) return;
        const { data } = await supabase.from('employees').select('role').eq('emp_id', user.emp_id).single();
        if (data?.role === 'Admin' || data?.role === 'Manager') {
            setIsAdmin(true);
        }
    };

    const fetchEmployees = async () => {
        const { data } = await supabase.from('employees').select('emp_id, name');
        setEmployees(data || []);
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
            let query = supabase.from('attendance').select('*');

            if (isAdmin) {
                if (viewMode === 'daily') {
                    // আজকের ডাটা যদি না থাকে, তবে সবশেষ ডাটাগুলো দেখাবে যাতে টেবিল খালি না থাকে
                    const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today);
                    if (count === 0) {
                        query = query.limit(50); // আজকে ডাটা নেই, তাই সবশেষ ৫০টি রেকর্ড দেখাও
                    } else {
                        query = query.eq('date', today);
                    }
                } else if (selectedEmp) {
                    query = query.eq('emp_id', selectedEmp);
                } else {
                    query = query.limit(50);
                }
            } else {
                const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE');
                query = query.eq('emp_id', user.emp_id).gte('date', firstDay);
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

            {/* বাটনগুলো যদি এখন না আসে, তবে বুঝতে হবে আপনার user.emp_id টাও কোড পাচ্ছে না */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto overflow-hidden shadow-inner">
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
                    <tbody className="divide-y divide-slate-50 text-sm">
                        {loading ? (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-200 uppercase tracking-widest">Syncing logs...</td></tr>
                        ) : logs.length > 0 ? (
                            logs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-all font-bold">
                                    <td className="p-8">
                                        <p className="text-xs text-slate-900 uppercase">
                                            {(isAdmin && viewMode === 'daily') ? log.name : new Date(log.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                        </p>
                                        <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">ID: {log.emp_id}</p>
                                    </td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500 italic">{log.time_in}</td>
                                    <td className="p-8 font-mono text-[10px] text-slate-500 italic">{log.time_out || '--:--'}</td>
                                    <td className="p-8 text-right">
                                        <span className={`text-[8px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                            {log.time_out ? 'Finished' : 'On Duty'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest italic">No Records Found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
