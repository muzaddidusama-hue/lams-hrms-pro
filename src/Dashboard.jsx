import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [todaysLog, setTodaysLog] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        fetchDashboardData();
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const [empRes, activeRes, totalPresentRes, noticeRes, holidayRes] = await Promise.all([
                supabase.from('employees').select('*', { count: 'exact', head: true }),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr).is('time_out', null),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                supabase.from('notices').select('*').order('date', { ascending: false }).limit(2),
                supabase.from('holidays').select('*').gte('date', todayStr).limit(3)
            ]);

            setStats({
                total: empRes.count || 0,
                activeNow: activeRes.count || 0,
                absent: Math.max(0, (empRes.count || 0) - (totalPresentRes.count || 0)),
                leaves: 0 
            });

            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', user.emp_id).eq('date', todayStr).maybeSingle();
            setTodaysLog(myAtt || null);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAttendance = async (action) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-CA');
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        if (action === 'clock_in') await supabase.from('attendance').insert([{ emp_id: user.emp_id, name: user.name, date: dateStr, time_in: timeStr }]);
        else await supabase.from('attendance').update({ time_out: timeStr }).eq('emp_id', user.emp_id).eq('date', dateStr);
        fetchDashboardData();
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-sans font-black text-slate-200 text-2xl animate-pulse tracking-widest uppercase">Syncing Workspace</div>;

    return (
        <div className="max-w-[1300px] mx-auto space-y-12 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            
            {/* --- PREMIUM COMPACT HEADER --- */}
            <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
                <div className="relative z-10 text-center lg:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-3">Lams Power Workspace</p>
                    <h1 className="text-3xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                        Assalamu Alaikum,<br/>
                        <span className="text-slate-400 font-normal italic">{user?.name}</span>
                    </h1>
                </div>

                <div className="relative z-10 p-1 bg-slate-900 rounded-[2.5rem] shadow-xl">
                    <div className="bg-slate-950 px-10 py-10 rounded-[2.3rem] text-center">
                        <h2 className="text-4xl font-black text-white tracking-tighter">{currentTime}</h2>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Standard Time</p>
                    </div>
                </div>
            </div>

            {/* --- STATS SECTION --- */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Staff Force" value={stats.total} />
                    <StatCard label="Active Now" value={stats.activeNow} isPositive />
                    <StatCard label="Absent Today" value={stats.absent} isNegative />
                    <StatCard label="Leaves" value={stats.leaves} isWarning />
                </div>
            )}

            {/* --- DUTY HUB (Premium Dark) --- */}
            <div className="bg-slate-950 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 text-white text-xl">
                        <i className="fa-solid fa-fingerprint"></i>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Attendance</p>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Shift Control</h2>
                    </div>
                </div>
                <div className="w-full md:w-auto relative z-10">
                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} className="w-full md:w-64 py-5 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg">Start Session</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} className="w-full md:w-64 py-5 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">End Session</button>
                    ) : (
                        <div className="w-full md:w-64 py-5 bg-white/5 border border-white/10 text-white/30 rounded-2xl font-black text-[10px] uppercase text-center">Duty Completed</div>
                    )}
                </div>
            </div>

            {/* --- BOARDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <BoardCard title="Notice Board" icon="fa-bullhorn" color="text-orange-500" items={notices} type="notice" />
                <BoardCard title="Upcoming Holidays" icon="fa-calendar-star" color="text-blue-500" items={holidays} type="holiday" />
            </div>
        </div>
    );
}

function StatCard({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center hover:shadow-lg transition-all">
            <div className={`w-1 h-5 rounded-full mb-5 ${isPositive ? 'bg-green-500' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}

function BoardCard({ title, icon, color, items, type }) {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-sm min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                <i className={`fa-solid ${icon} ${color}`}></i> {title}
            </h3>
            <div className="space-y-6">
                {items.length > 0 ? items.map((item, idx) => (
                    <div key={idx} className={`${type === 'notice' ? 'p-6 bg-slate-50 border-l-4 border-slate-950' : 'flex justify-between p-4 border-b border-slate-50'} rounded-2xl`}>
                        {type === 'notice' ? (
                            <>
                                <p className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tight">{item.title}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{item.message}</p>
                            </>
                        ) : (
                            <>
                                <span className="font-bold text-slate-800 text-xs">{item.occasion}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400">{item.date}</span>
                            </>
                        )}
                    </div>
                )) : <p className="text-[10px] font-bold text-slate-200 uppercase italic">No records found</p>}
            </div>
        </div>
    );
}
