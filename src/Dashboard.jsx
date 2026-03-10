import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0 });
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        fetchData();
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        const today = new Date().toLocaleDateString('en-CA');
        const [emp, act, tot, ntc, hol] = await Promise.all([
            supabase.from('employees').select('*', { count: 'exact', head: true }),
            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).is('time_out', null),
            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today),
            supabase.from('notices').select('*').order('date', { ascending: false }).limit(2),
            supabase.from('holidays').select('*').gte('date', today).limit(3)
        ]);
        setStats({ total: emp.count || 0, activeNow: act.count || 0, absent: (emp.count || 0) - (tot.count || 0) });
        setNotices(ntc.data || []);
        setHolidays(hol.data || []);
        setLoading(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-light text-slate-400 tracking-widest text-xs uppercase">Loading Dashboard</div>;

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-16 animate-[fadeIn_0.5s_ease-in-out]">
            
            {/* --- MINIMAL HEADER --- */}
            <div className="flex justify-between items-end border-b border-slate-100 pb-10">
                <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Workspace</p>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight">
                        Welcome back, <span className="font-semibold text-slate-950">{user?.name}</span>
                    </h1>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-light text-slate-900 tracking-tighter">{currentTime}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">March 2026</p>
                </div>
            </div>

            {/* --- QUIET STATS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <StatBox label="Total Staff" value={stats.total} />
                <StatBox label="Active Personnel" value={stats.activeNow} />
                <StatBox label="Off Duty" value={stats.absent} />
            </div>

            {/* --- CONTENT GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20 pt-10">
                {/* Notices */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.3em] mb-8 border-l-2 border-slate-900 pl-4">Noticeboard</h3>
                    <div className="space-y-10">
                        {notices.map(n => (
                            <div key={n.id} className="group">
                                <p className="text-[10px] text-slate-400 mb-2">{n.date}</p>
                                <h4 className="text-sm font-semibold text-slate-800 mb-2 group-hover:text-slate-950 transition-colors">{n.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-light">{n.message}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Holidays */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.3em] mb-8 border-l-2 border-slate-900 pl-4">Upcoming Holidays</h3>
                    <div className="divide-y divide-slate-50">
                        {holidays.map(h => (
                            <div key={h.id} className="py-4 flex justify-between items-center group">
                                <span className="text-xs font-medium text-slate-700">{h.occasion}</span>
                                <span className="text-[10px] text-slate-300 group-hover:text-slate-500 transition-colors font-mono">{h.date}</span>
                            </div>
                        ))}
                        <div className="py-4 flex justify-between items-center opacity-50">
                            <span className="text-xs font-medium text-slate-400">Weekly Off</span>
                            <span className="text-[10px] text-slate-300 font-mono">FRIDAYS</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="bg-white p-8 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-4">{label}</p>
            <p className="text-3xl font-light text-slate-900 tracking-tighter">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
