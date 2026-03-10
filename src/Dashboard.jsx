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

    if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">LOADING...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out] pb-20 px-2">
            
            {/* 👑 Welcome & Clock Hero Section */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-400">Workspace Overview</span>
                        <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">Welcome, {user?.name?.split(' ')[0]}!</h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Manage your workspace and track productivity.</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center min-w-[200px]">
                        <h2 className="text-4xl font-black tracking-tighter">{currentTime}</h2>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">Live Server Time</p>
                    </div>
                </div>
            </div>

            {/* 📊 High-End Admin Stats Card */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <ModernStatBox label="Total Staff" value={stats.total} icon="fa-users" color="orange" />
                    <ModernStatBox label="Present" value={stats.present} icon="fa-user-check" color="green" />
                    <ModernStatBox label="Absent" value={stats.absent} icon="fa-user-xmark" color="red" />
                    <ModernStatBox label="Pending" value={stats.leaves} icon="fa-envelope-open-text" color="blue" />
                </div>
            )}

            {/* 🕒 Work Session Section */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-800 shadow-inner">
                        <i className="fa-solid fa-stopwatch text-2xl"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Session</p>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{workDuration}</h2>
                    </div>
                </div>
                
                <div className="w-full md:w-auto">
                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} disabled={loadingAction} className="w-full bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 active:scale-95 transition-all">Clock In</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} disabled={loadingAction} className="w-full bg-red-500 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-600 active:scale-95 transition-all">Clock Out</button>
                    ) : (
                        <div className="bg-green-50 text-green-600 px-12 py-4 rounded-2xl font-black text-xs uppercase border border-green-100 text-center">Shift Finished</div>
                    )}
                </div>
            </div>

        </div>
    );
}

function ModernStatBox({ label, value, icon, color }) {
    const colors = {
        orange: "text-orange-500 bg-orange-50",
        green: "text-green-600 bg-green-50",
        red: "text-red-500 bg-red-50",
        blue: "text-blue-500 bg-blue-50"
    };
    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colors[color]}`}>
                <i className={`fa-solid ${icon} text-lg`}></i>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
        </div>
    );
}
