import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Link } from 'react-router-dom';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState('00:00:00');
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [todaysLog, setTodaysLog] = useState(null);
    const [workDuration, setWorkDuration] = useState('00h 00m 00s');
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        return () => clearInterval(timer); 
    }, []);

    useEffect(() => {
        fetchDashboardData();
        if (isAdmin) {
            const channel = supabase.channel('dashboard-sync-unit')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchDashboardData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchDashboardData())
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [isAdmin]);

    const fetchDashboardData = async () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        try {
            if (isAdmin) {
                const [empRes, activeRes, totalPresentRes, leaveRes] = await Promise.all([
                    supabase.from('employees').select('*', { count: 'exact', head: true }),
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr).is('time_out', null),
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
                ]);

                setStats({ 
                    total: empRes.count || 0, 
                    activeNow: activeRes.count || 0, 
                    absent: Math.max(0, (empRes.count || 0) - (totalPresentRes.count || 0)), 
                    leaves: leaveRes.count || 0 
                });
            }
            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', user.emp_id).eq('date', todayStr).maybeSingle();
            setTodaysLog(myAtt || null);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => {
        let interval;
        if (todaysLog?.time_in && !todaysLog?.time_out) {
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

    if (loading) return <div className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase tracking-[0.4em]">Optimizing...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-[fadeIn_0.6s_ease-out] pb-24 px-4">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Imperial+Script&display=swap');`}</style>
            
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.04)] border border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12 text-center lg:text-left">
                    <div>
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-6"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div><span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.5em]">Live Intelligence</span></div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.2] tracking-tight">Assalamu Alaikum,<br/><span style={{ fontFamily: "'Imperial Script', cursive", fontWeight: 'normal' }} className="text-slate-600 block mt-2 text-5xl md:text-6xl lg:text-7xl">{user?.name}</span></h1>
                    </div>
                    <div className="p-12 bg-slate-950 rounded-[3rem] shadow-2xl min-w-[300px]"><h2 className="text-5xl font-black tracking-tighter text-white">{currentTime}</h2><p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-4">System Time</p></div>
                </div>
            </div>

            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link to="/team" className="block"><ExecutiveStat label="Total Staff" value={stats.total} /></Link>
                    <Link to="/attendance" className="block"><ExecutiveStat label="Active Now" value={stats.activeNow} isPositive /></Link>
                    <Link to="/attendance" className="block"><ExecutiveStat label="Absent Today" value={stats.absent} isNegative /></Link>
                    <Link to="/leaves" className="block"><ExecutiveStat label="Pending" value={stats.leaves} isWarning /></Link>
                </div>
            )}
        </div>
    );
}

function ExecutiveStat({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 flex flex-col items-center text-center hover:shadow-xl transition-all duration-500 h-full border-b-4 border-b-transparent hover:border-b-slate-900">
            <div className={`w-1.5 h-6 rounded-full mb-6 ${isPositive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : isNegative ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : isWarning ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-slate-200'}`}></div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
