import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        fetchData();
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const [emp, act, tot, ntc, hol] = await Promise.all([
            supabase.from('employees').select('*', { count: 'exact', head: true }),
            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr).is('time_out', null),
            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
            supabase.from('notices').select('*').order('date', { ascending: false }).limit(2),
            supabase.from('holidays').select('*').gte('date', todayStr).limit(3)
        ]);
        setStats({ total: emp.count || 0, activeNow: act.count || 0, absent: (emp.count || 0) - (tot.count || 0), leaves: 0 });
        setNotices(ntc.data || []);
        setHolidays(hol.data || []);
        setLoading(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black tracking-[1em] text-slate-200">LAMS</div>;

    return (
        <div className="max-w-[1200px] mx-auto space-y-24 pb-40 px-6 animate-[fadeIn_1s_ease-in-out]">
            
            {/* --- MINIMALIST HERO --- */}
            <div className="pt-20 border-b border-slate-100 pb-20 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.6em] text-slate-400 mb-8">Workspace Executive</p>
                    <h1 className="text-6xl md:text-[10rem] font-black text-slate-900 leading-[0.8] tracking-[-0.05em]">
                        Hello,<br/>
                        <span className="font-serif italic font-bold text-slate-800 tracking-normal block mt-4">
                            {user?.name}
                        </span>
                    </h1>
                </div>
                <div className="absolute top-0 right-0 text-right">
                    <h2 className="text-4xl md:text-6xl font-light text-slate-300 tracking-tighter">{currentTime}</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">Local Time</p>
                </div>
            </div>

            {/* --- CLEAN STATS --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 border-b border-slate-50 pb-20">
                <StatItem label="Staff Force" value={stats.total} />
                <StatItem label="On Duty" value={stats.activeNow} />
                <StatItem label="Absent" value={stats.absent} />
                <StatItem label="Leaves" value={stats.leaves} />
            </div>

            {/* --- BOARDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 mb-12 flex items-center gap-4">
                        <span className="w-2 h-2 bg-slate-900 rounded-full"></span> Notice board
                    </h3>
                    <div className="space-y-12">
                        {notices.map(n => (
                            <div key={n.id} className="group border-l border-slate-100 pl-8 hover:border-slate-900 transition-all">
                                <p className="text-[9px] font-bold text-slate-300 uppercase mb-3">{n.date}</p>
                                <h4 className="text-xl font-semibold text-slate-800 mb-3">{n.title}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed font-light">{n.message}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 mb-12 flex items-center gap-4">
                        <span className="w-2 h-2 bg-slate-900 rounded-full"></span> Calendar
                    </h3>
                    <div className="space-y-6">
                        {holidays.map(h => (
                            <div key={h.id} className="flex justify-between items-baseline py-4 border-b border-slate-50">
                                <span className="font-medium text-slate-800 text-sm">{h.occasion}</span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase">{h.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatItem({ label, value }) {
    return (
        <div className="flex flex-col">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">{label}</p>
            <p className="text-5xl font-light text-slate-900">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
