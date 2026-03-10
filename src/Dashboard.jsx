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

    if (loading) return <div className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase tracking-[0.4em]">Initializing Core...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-[fadeIn_0.6s_ease-out] pb-24 px-4">
            
            {/* 🌑 Ultra-Minimalist Hero Section */}
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                            <div className="w-2 h-2 bg-slate-800 rounded-full animate-ping"></div>
                            <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Internal System v3.0</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                            Assalamu Alaikum,<br/>
                            <span className="text-slate-400 font-light italic">{user?.name}</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-6 font-medium tracking-wide">Lams Power Employee Management Portal</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-10 bg-slate-900 rounded-[3rem] shadow-2xl min-w-[280px]">
                        <h2 className="text-5xl font-black tracking-tighter text-white">{currentTime}</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">Live Clock</p>
                    </div>
                </div>
            </div>

            {/* 📊 High-Definition Admin Stats */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <ExecutiveStat label="Total Staff" value={stats.total} />
                    <ExecutiveStat label="Present" value={stats.present} isPositive />
                    <ExecutiveStat label="Absent" value={stats.absent} isNegative />
                    <ExecutiveStat label="Pending Leaves" value={stats.leaves} isWarning />
                </div>
            )}

            {/* ⏱️ Clean Work Session Area */}
            <div className="bg-slate-50/50 backdrop-blur-sm rounded-[3rem] p-8 md:p-12 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-900 shadow-sm border border-slate-100">
                        <i className="fa-solid fa-clock-rotate-left text-2xl"></i>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Session Active</p>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{workDuration}</h2>
                    </div>
                </div>
                
                <div className="w-full md:w-auto">
                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} disabled={loadingAction} className="w-full md:w-72 h-16 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98]">
                            Start Duty
                        </button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} disabled={loadingAction} className="w-full md:w-72 h-16 bg-white text-red-600 border border-red-100 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-50 transition-all active:scale-[0.98]">
                            End Duty
                        </button>
                    ) : (
                        <div className="w-full md:w-72 h-16 bg-green-50 text-green-700 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] border border-green-100 flex items-center justify-center gap-3">
                            <i className="fa-solid fa-check-double"></i> Shift Completed
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

function ExecutiveStat({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-start group hover:shadow-md transition-all duration-300">
            <div className={`w-1 h-8 rounded-full mb-6 ${isPositive ? 'bg-green-500' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-300'}`}></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
