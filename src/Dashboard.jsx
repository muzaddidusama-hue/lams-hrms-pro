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

    // রিয়েল-টাইম ঘড়ি
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        return () => clearInterval(timer); 
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        const todayStr = new Date().toLocaleDateString('en-CA');

        try {
            if (isAdmin) {
                // 🚀 একবারে সব কাউন্ট নিয়ে আসা (সুপার ফাস্ট)
                const [empCount, attCount, leaveCount] = await Promise.all([
                    supabase.from('employees').select('*', { count: 'exact', head: true }),
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
                ]);

                const total = empCount.count || 0;
                const present = attCount.count || 0;
                
                setStats({
                    total,
                    present,
                    absent: Math.max(0, total - present),
                    leaves: leaveCount.count || 0
                });
            }

            // নিজের এটেনডেন্স চেক
            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', user.emp_id).eq('date', todayStr).maybeSingle();
            if(myAtt) setTodaysLog(myAtt);

        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // ওয়ার্ক ডিউরেশন ক্যালকুলেশন
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
        }
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
        <div className="max-w-7xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out] pb-10">
            
            {/* Clock & Status Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">{currentTime}</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Current Network Time</p>
                
                <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Work Duration</span>
                        <span className="text-lg font-black text-slate-800">{workDuration}</span>
                    </div>

                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} disabled={loadingAction} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">CLOCK IN</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} disabled={loadingAction} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">CLOCK OUT</button>
                    ) : (
                        <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl font-black text-sm uppercase border border-green-100">SHIFT COMPLETED</div>
                    )}
                </div>
            </div>

            {/* 📊 Admin Number Statistics (চার্ট ছাড়া) */}
            {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatBox label="Total Staff" value={stats.total} icon="fa-users" color="text-slate-800" bg="bg-white" />
                    <StatBox label="Present Today" value={stats.present} icon="fa-user-check" color="text-green-600" bg="bg-white" />
                    <StatBox label="Absent Today" value={stats.absent} icon="fa-user-xmark" color="text-red-500" bg="bg-white" />
                    <StatBox label="Pending Leaves" value={stats.leaves} icon="fa-envelope-open-text" color="text-orange-500" bg="bg-white" />
                </div>
            )}
        </div>
    );
}

// সুন্দর এবং সিম্পল স্ট্যাট কার্ড
function StatBox({ label, value, icon, color, bg }) {
    return (
        <div className={`${bg} p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 ${color}`}>
                <i className={`fa-solid ${icon} text-xl`}></i>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className={`text-3xl font-black ${color} tracking-tighter`}>{value}</p>
            </div>
        </div>
    );
}
