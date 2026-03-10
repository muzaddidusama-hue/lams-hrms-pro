import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState('00:00:00');
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leaves: 0 });
    const [todaysLog, setTodaysLog] = useState(null);
    const [workDuration, setWorkDuration] = useState('00h 00m 00s');
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState(false);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        return () => clearInterval(timer); 
    }, []);

    useEffect(() => { fetchDashboardData(); }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        const todayStr = new Date().toLocaleDateString('en-CA');
        try {
            if (isAdmin) {
                const [empCount, attCount, leaveCount] = await Promise.all([
                    supabase.from('employees').select('*', { count: 'exact', head: true }),
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
                ]);
                const total = empCount.count || 0;
                const present = attCount.count || 0;
                setStats({ total, present, absent: Math.max(0, total - present), leaves: leaveCount.count || 0 });
            }
            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', user.emp_id).eq('date', todayStr).maybeSingle();
            if(myAtt) setTodaysLog(myAtt);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => {
        let interval;
        if (todaysLog && todaysLog.time_in && !todaysLog.time_out) {
            const start = new Date(`${todaysLog.date}T${todaysLog.time_in}`);
            interval = setInterval(() => {
                const diff = new Date() - start;
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setWorkDuration(`${h.toString().padStart(2,'0')}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`);
            }, 1000);
        } else { setWorkDuration("00h 00m 00s"); }
        return () => clearInterval(interval);
    }, [todaysLog]);

    const handleAttendance = async (action) => {
        setLoadingAction(true);
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-CA');
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        try {
            if (action === 'clock_in') {
                await supabase.from('attendance').insert([{ emp_id: user.emp_id, name: user.name, date: dateStr, time_in: timeStr }]);
            } else {
                await supabase.from('attendance').update({ time_out: timeStr }).eq('emp_id', user.emp_id).eq('date', dateStr);
            }
            fetchDashboardData(); 
        } catch (err) { alert("Error!"); } finally { setLoadingAction(false); }
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-[0.2em]">Authenticating Portal...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out] pb-24 px-4">
            
            {/* 💎 Premium Hero Section */}
            <div className="relative p-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-[3rem] shadow-2xl">
                <div className="bg-slate-950 rounded-[2.9rem] p-10 md:p-14 text-white overflow-hidden relative">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-orange-500 opacity-20 blur-[100px]"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-center md:text-left">
                            <p className="text-orange-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Lams Power HQ</p>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                Assalamu Alaikum,<br/>
                                <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>
                            </h1>
                        </div>
                        <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-xl shadow-inner min-w-[240px]">
                            <h2 className="text-5xl font-black tracking-tighter text-white">{currentTime}</h2>
                            <div className="h-0.5 w-12 bg-orange-500 my-4"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Standard Time</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📊 Admin Status Cards (No-Scroll Grid) */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Staff" value={stats.total} icon="fa-users" accent="bg-blue-500" />
                    <StatCard label="In Office" value={stats.present} icon="fa-user-check" accent="bg-green-500" />
                    <StatCard label="Off-Duty" value={stats.absent} icon="fa-user-xmark" accent="bg-red-500" />
                    <StatCard label="Pending" value={stats.leaves} icon="fa-inbox" accent="bg-orange-500" />
                </div>
            )}

            {/* 🕒 Work Session & Action */}
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-800 shadow-xl border border-slate-100">
                        <i className="fa-solid fa-bolt-lightning text-3xl text-orange-500"></i>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Session Duration</p>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{workDuration}</h2>
                    </div>
                </div>
                
                <div className="w-full md:w-auto">
                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} disabled={loadingAction} className="group relative w-full md:w-64 h-16 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase overflow-hidden transition-all active:scale-95">
                            <span className="relative z-10">Initialize Clock In</span>
                            <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} disabled={loadingAction} className="w-full md:w-64 h-16 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-700 active:scale-95 transition-all">
                            Terminate Shift
                        </button>
                    ) : (
                        <div className="w-full md:w-64 h-16 bg-green-50 text-green-600 rounded-2xl font-black text-xs uppercase border-2 border-green-100 flex items-center justify-center gap-2">
                            <i className="fa-solid fa-circle-check"></i> Day Completed
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

function StatCard({ label, value, icon, accent }) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group transition-all hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${accent} text-white`}>
                <i className={`fa-solid ${icon} text-lg`}></i>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
