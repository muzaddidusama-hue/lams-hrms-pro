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
        setLoading(true);
        try {
            const todayStr = new Date().toLocaleDateString('en-CA');
            
            // ১. স্ট্যাটাস কার্ডের ডাটা
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
                leaves: 0 // প্রয়োজন হলে লিভ টেবিল থেকে কাউন্ট আনতে পারেন
            });

            // ২. নোটিশ এবং হলিডে (আপনার কলাম নেম অনুযায়ী)
            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

            // ৩. নিজের আজকের এটেনডেন্স
            const { data: myAtt } = await supabase.from('attendance')
                .select('*')
                .eq('emp_id', user.emp_id)
                .eq('date', todayStr)
                .maybeSingle();
            
            setTodaysLog(myAtt || null);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendance = async (action) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-CA');
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
        
        if (action === 'clock_in') {
            await supabase.from('attendance').insert([{ 
                emp_id: user.emp_id, 
                name: user.name, 
                date: dateStr, 
                time_in: timeStr 
            }]);
        } else {
            await supabase.from('attendance').update({ time_out: timeStr })
                .eq('emp_id', user.emp_id)
                .eq('date', dateStr);
        }
        fetchDashboardData();
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-200 animate-pulse tracking-[0.4em]">SYNCING LAMS POWER...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            {/* 👑 Welcome Header */}
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-12">
                <div className="text-center lg:text-left">
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.2] tracking-tighter">
                        Assalamu Alaikum,<br/><span className="text-slate-400 italic font-normal">{user?.name}</span>
                    </h1>
                </div>
                <div className="p-12 bg-slate-950 rounded-[3rem] shadow-2xl min-w-[300px] text-center">
                    <h2 className="text-5xl font-black text-white tracking-tighter">{currentTime}</h2>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-4">Standard Time</p>
                </div>
            </div>

            {/* 📊 Executive Stats */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <ExecutiveStat label="Staff Force" value={stats.total} />
                    <ExecutiveStat label="Active Now" value={stats.activeNow} isPositive />
                    <ExecutiveStat label="Absent Today" value={stats.absent} isNegative />
                    <ExecutiveStat label="Leaves" value={stats.leaves} isWarning />
                </div>
            )}

            {/* ⚡ Duty Hub */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex items-center gap-8 text-center md:text-left">
                    <div className="w-20 h-20 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl">
                        <i className="fa-solid fa-bolt text-2xl text-orange-400"></i>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Session</p>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Duty Status</h2>
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    {!todaysLog ? (
                        <button onClick={() => handleAttendance('clock_in')} className="w-full md:w-80 h-16 bg-slate-950 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Start Duty</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleAttendance('clock_out')} className="w-full md:w-80 h-16 bg-white text-red-600 border-2 border-red-50 rounded-[1.8rem] font-black text-xs uppercase shadow-lg active:scale-95 transition-all">End Duty</button>
                    ) : (
                        <div className="w-full md:w-80 h-16 bg-green-50 text-green-700 rounded-[1.8rem] font-black text-xs uppercase border border-green-100 flex items-center justify-center gap-3">
                            <i className="fa-solid fa-check-circle"></i> Shift Finished
                        </div>
                    )}
                </div>
            </div>

            {/* 📢 Boards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[300px]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                        <i className="fa-solid fa-bullhorn text-orange-500"></i> Notice Board
                    </h3>
                    <div className="space-y-6">
                        {notices.map(n => (
                            <div key={n.id} className="p-6 bg-slate-50 rounded-2xl border-l-4 border-slate-950">
                                <p className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tight">{n.title}</p>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.message}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[300px]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                        <i className="fa-solid fa-calendar-star text-blue-500"></i> Upcoming Holidays
                    </h3>
                    <div className="space-y-4">
                        {holidays.map(h => (
                            <div key={h.id} className="flex items-center justify-between p-4 border-b border-slate-50">
                                <span className="font-bold text-slate-800 text-xs">{h.occasion}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{h.date}</span>
                            </div>
                        ))}
                        <div className="flex justify-between p-4 text-slate-400">
                            <span className="text-xs font-bold italic">Every Friday</span>
                            <span className="text-[9px] font-black uppercase">Weekly Off</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExecutiveStat({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 flex flex-col items-center text-center transition-all h-full hover:shadow-xl duration-500">
            <div className={`w-1.5 h-6 rounded-full mb-6 ${isPositive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
