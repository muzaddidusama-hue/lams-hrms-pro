import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance() {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchLogs(); }, [selectedDate]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('attendance').select('*').eq('date', selectedDate).order('time_in', { ascending: false });
            setLogs(data || []);
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Daily Attendance Log</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Total Present: <span className="text-orange-500 font-bold">{logs.length}</span></p>
                </div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-3 md:p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm text-slate-700 outline-none focus:border-orange-500 w-full md:w-auto" />
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[550px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-4 md:p-6 whitespace-nowrap">Employee</th>
                                <th className="p-4 md:p-6 text-center whitespace-nowrap">Clock In</th>
                                <th className="p-4 md:p-6 text-center whitespace-nowrap">Clock Out</th>
                                <th className="p-4 md:p-6 text-right whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 md:p-6">
                                        <div className="font-bold text-slate-800 text-sm whitespace-nowrap">{log.name}</div>
                                        <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest">ID: {log.emp_id}</div>
                                    </td>
                                    <td className="p-4 md:p-6 text-center font-bold text-slate-600 tracking-tighter text-sm whitespace-nowrap">{log.time_in || '-'}</td>
                                    <td className="p-4 md:p-6 text-center font-bold text-slate-600 tracking-tighter text-sm whitespace-nowrap">{log.time_out || '-'}</td>
                                    <td className="p-4 md:p-6 text-right">
                                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${log.time_out ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-600 animate-pulse'}`}>
                                            {log.time_out ? 'Completed' : 'Active Now'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && logs.length === 0 && <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase">No records found for this date.</div>}
                </div>
            </div>
        </div>
    );
}
