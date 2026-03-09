import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance() {
    // ডিফল্টভাবে আজকের তারিখ সেট করা
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
    });
    
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // তারিখ চেঞ্জ হলেই নতুন করে ডাটা আনবে
    useEffect(() => {
        fetchLogs();
    }, [selectedDate]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', selectedDate)
                .order('time_in', { ascending: false }); // যারা পরে ঢুকেছে তারা উপরে থাকবে
            
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out]">
            
            {/* Header & Date Filter */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daily Attendance Log</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                        Total Present: <span className="text-orange-500 font-bold">{logs.length}</span>
                    </p>
                </div>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer shadow-sm w-full md:w-auto"
                />
            </div>

            {/* Attendance Table */}
            {loading ? (
                <div className="p-20 text-center"><div className="border-4 border-slate-200 border-t-orange-500 rounded-full w-10 h-10 animate-spin mx-auto"></div></div>
            ) : (
                <div className="bg-white rounded-[2.5rem] overflow-hidden overflow-x-auto shadow-sm border border-slate-100">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-6">Employee</th>
                                <th className="p-6 text-center">Clock In</th>
                                <th className="p-6 text-center">Clock Out</th>
                                <th className="p-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-6">
                                        <div className="font-bold text-slate-800 text-sm">{log.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">ID: {log.emp_id}</div>
                                    </td>
                                    <td className="p-6 text-center font-bold text-slate-600 tracking-tighter">
                                        {log.time_in || '-'}
                                    </td>
                                    <td className="p-6 text-center font-bold text-slate-600 tracking-tighter">
                                        {log.time_out || '-'}
                                    </td>
                                    <td className="p-6 text-right">
                                        {log.time_out ? (
                                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                Completed
                                            </span>
                                        ) : (
                                            <span className="inline-block px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                Active Now
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        No attendance records found for this date.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
}