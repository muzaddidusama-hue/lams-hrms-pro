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
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
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

            const totalEmp = empRes.count || 0;
            const presentToday = totalPresentRes.count || 0;

            setStats({
                total: totalEmp,
                activeNow: activeRes.count || 0,
                absent: Math.max(0, totalEmp - presentToday),
                leaves: 0 
            });

            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

            const { data: myAtt } = await supabase.from('attendance')
                .select('*')
                .eq('emp_id', user.emp_id)
                .eq('date', todayStr)
                .maybeSingle();
            
            setTodaysLog(myAtt || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendance = async (action) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-CA');
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        
        if (action === 'clock_in') {
            await supabase.from('attendance').insert([{ emp_id: user.emp_id, name: user.name, date: dateStr, time_in: timeStr }]);
        } else {
            await supabase.from('attendance').update({ time_out: timeStr }).eq('emp_id', user.emp_id).eq('date', dateStr);
        }
        fetchDashboardData();
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-display font-black text-slate-200 text-4xl animate-pulse tracking-widest">LAMS POWER</div>;

    return (
        <div className="max-w-[1400px] mx-auto space-y-16 pb-32 animate-[fadeIn_0.8s_ease-out]">
            
            {/* --- PREMIUM HEADER --- */}
            <div className="bg-white rounded-[4rem] p-10 md:p-20 shadow-[0_50px_100px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-12 relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:bg-blue-50 transition-all duration-700"></div>
                
                <div className="relative z-10 text-center lg:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 mb-6">Lams Power Workspace</p>
                    <h1 className="text-5xl lg:text-8xl font-black text-slate-900 leading-[0.85] tracking-tighter">
                        Assalamu<br/>
                        <span className="font-display italic text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-500 to-slate-900">
                            {user?.name}
                        </span>
                    </h1>
                    <div className="mt-10 flex items-center gap-4 justify-center lg:justify-start">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Systems Active</span>
                    </div>
                </div>

                <div className="relative z-10 p-1.5 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[3.8rem] shadow-2xl transition-transform hover:scale-105 duration-700">
                    <div className="bg-slate-950 px-14 py-16 rounded-[3.5rem] text-center border border-white/5">
                        <h2 className="text-7xl font-black text-white tracking-tighter font-display leading-none">{currentTime}</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.6em] mt-6">Dhaka, BD</p>
                    </div>
                </div>
            </div>

            {/* --- STATS SECTION --- */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard label="Total Force" value={stats.total} />
                    <StatCard label="Live Now" value={stats.activeNow} color="text-green-500" />
                    <StatCard label="Away" value={stats.absent} color="text-red-400" />
                    <StatCard label="In Review" value={stats.leaves} color="text-amber-500" />
                </div>
            )}

            {/* --- DUTY CONTROL --- */}
            <div className="bg-slate-950 rounded-[3.5rem] p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="flex items-center gap-10 relative z-10">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center border border-white/10">
                        <i className="fa-solid fa-fingerprint text-3xl text-white"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Biometric Verification</p>
                        <h2 className="text-3xl font-black text-white tracking-tight">Shift Control</h2>
                    </div>
                </div>
                <div className="w-full md:w-auto relative z-10">
                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} className="w-full md:w-80 py-6 bg-white text-slate-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-200 transition-all shadow-xl">Start Session</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} className="w-full md:w-80 py-6 bg-red-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-red-600 transition-all shadow-xl">End Session</button>
                    ) : (
                        <div className="w-full md:w-80 py-6 bg-white/5 border border-white/10 text-white/40 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] text-center">Duty Completed</div>
                    )}
                </div>
            </div>

            {/* --- BOARDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white rounded-[3.5rem] p-12 border border-slate-50 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 flex items-center gap-4">
                            <span className="w-8 h-1 bg-slate-900 rounded-full"></span> Notice board
                        </h3>
                    </div>
                    <div className="space-y-8">
                        {notices.map(n => (
                            <div key={n.id} className="group cursor-default">
                                <p className="text-[10px] font-black text-slate-300 uppercase mb-2">{n.date}</p>
                                <h4 className="text-lg font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">{n.title}</h4>
                                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{n.message}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] p-12 border border-slate-50 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 flex items-center gap-4">
                            <span className="w-8 h-1 bg-slate-900 rounded-full"></span> Upcoming
                        </h3>
                    </div>
                    <div className="space-y-6">
                        {holidays.map(h => (
                            <div key={h.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2rem]">
                                <span className="font-black text-slate-800 uppercase text-xs tracking-tight">{h.occasion}</span>
                                <span className="text-[10px] font-black text-slate-400">{h.date}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center p-6 border border-dashed border-slate-200 rounded-[2rem]">
                            <span className="font-bold text-slate-400 text-xs">Weekly Off</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Every Friday</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color = "text-slate-900" }) {
    return (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-500 group">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] mb-6 group-hover:text-slate-400 transition-colors">{label}</p>
            <p className={`text-6xl font-black tracking-tighter font-display ${color}`}>{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
