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
        <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out] pb-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-4">
                <div className="text-center md:text-left">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Attendance Log</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase">Total Present: <span className="text-orange-500 font-bold">{logs.length}</span></p>
                </div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm text-slate-700 outline-none w-full md:w-auto" />
            </div>

            {/* 📱 Mobile Optimized Card List */}
            <div className="grid grid-cols-1 gap-4">
                {logs.map((log) => (
                    <div key={log.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-800 text-base">{log.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {log.emp_id}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.time_out ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-600 animate-pulse'}`}>
                                {log.time_out ? 'Completed' : 'Active'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-3">
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Clock In</p>
                                <p className="text-sm font-black text-slate-700">{log.time_in || '-'}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Clock Out</p>
                                <p className="text-sm font-black text-slate-700">{log.time_out || '-'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {!loading && logs.length === 0 && <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase">No records found</div>}
        </div>
    );
}
