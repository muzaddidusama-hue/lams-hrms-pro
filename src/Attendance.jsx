import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance({ user }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'individual'
    const isAdmin = user?.role?.toLowerCase().includes('admin');

    useEffect(() => {
        if (isAdmin) fetchEmployees();
        fetchLogs();
    }, [selectedEmp, viewMode]);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('employees').select('emp_id, name');
        setEmployees(data || []);
    };

    const fetchLogs = async () => {
        const today = new Date().toLocaleDateString('en-CA');
        let query = supabase.from('attendance').select('*');

        if (isAdmin) {
            if (viewMode === 'daily') {
                query = query.eq('date', today); // ১. আজকের দিনে কে কে আছে
            } else if (selectedEmp) {
                query = query.eq('emp_id', selectedEmp); // ২. ড্রপডাউন থেকে সিলেক্টেড এমপ্লয়ী
            }
        } else {
            // সাধারণ এমপ্লয়ী শুধু নিজের মাসের লগ দেখবে
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
            query = query.eq('emp_id', user.emp_id).gte('date', firstDay);
        }

        const { data } = await query.order('date', { ascending: false });
        setLogs(data || []);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Attendance Logs</h1>

            {isAdmin && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                        <button onClick={() => setViewMode('daily')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>Daily View</button>
                        <button onClick={() => setViewMode('individual')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>Employee Wise</button>
                    </div>

                    {viewMode === 'individual' && (
                        <select 
                            onChange={(e) => setSelectedEmp(e.target.value)}
                            className="flex-1 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-slate-950"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => <option key={emp.emp_id} value={emp.emp_id}>{emp.name} ({emp.emp_id})</option>)}
                        </select>
                    )}
                </div>
            )}

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
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
                        {logs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-all font-bold">
                                <td className="p-8">
                                    <p className="text-xs text-slate-900">{isAdmin && viewMode === 'daily' ? log.name : log.date}</p>
                                    <p className="text-[8px] text-slate-300 uppercase tracking-widest">{log.emp_id}</p>
                                </td>
                                <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_in}</td>
                                <td className="p-8 font-mono text-[10px] text-slate-500">{log.time_out || '--:--'}</td>
                                <td className="p-8 text-right">
                                    <span className={`text-[8px] px-3 py-1 rounded-lg uppercase ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                        {log.time_out ? 'Completed' : 'Active'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
