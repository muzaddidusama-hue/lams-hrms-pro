import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [attendanceLogs, setAttendanceLogs] = useState([]);
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
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-CA');
            
            // ১. স্ট্যাটাস কার্ড ডাটা
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

            // ২. ডাইনামিক এটেনডেন্স লগ (Admin vs Employee)
            let logsQuery = supabase.from('attendance').select('*');
            if (isAdmin) {
                logsQuery = logsQuery.eq('date', todayStr).order('time_in', { ascending: false });
            } else {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
                logsQuery = logsQuery.eq('emp_id', user.emp_id).gte('date', firstDay).order('date', { ascending: false });
            }
            const { data: logsData } = await logsQuery;
            setAttendanceLogs(logsData || []);

            // ৩. বাটন স্ট্যাটাস ও অন্যান্য
            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', user.emp_id).eq('date', todayStr).maybeSingle();
            setTodaysLog(myAtt || null);
            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleBiometricAuth = async (action) => {
        if (!window.PublicKeyCredential) return alert("Biometric not supported");
        try {
            const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
            const options = { publicKey: { challenge, rp: { name: "LAMS" }, user: { id: Uint8Array.from(user.id, c => c.charCodeAt(0)), name: user.email, displayName: user.name }, pubKeyCredParams: [{ alg: -7, type: "public-key" }], authenticatorSelection: { authenticatorAttachment: "platform" }, timeout: 60000 } };
            const credential = await navigator.credentials.create(options);
            if (credential) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-CA');
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                if (action === 'clock_in') await supabase.from('attendance').insert([{ emp_id: user.emp_id, name: user.name, date: dateStr, time_in: timeStr }]);
                else await supabase.from('attendance').update({ time_out: timeStr }).eq('emp_id', user.emp_id).eq('date', dateStr);
                fetchDashboardData();
            }
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-200 text-2xl animate-pulse tracking-[0.4em] uppercase">Lams Power</div>;

    return (
        <div className="max-w-[1300px] mx-auto space-y-12 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            
            {/* 👑 PREMIUM HEADER */}
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-12 relative overflow-hidden">
                <div className="relative z-10 text-center lg:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-3">Workspace Dashboard</p>
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                        Assalamu Alaikum,<br/><span className="text-slate-400 italic font-normal">{user?.name}</span>
                    </h1>
                </div>
                <div className="p-12 bg-slate-950 rounded-[3.5rem] shadow-2xl min-w-[320px] text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10">
                        <h2 className="text-6xl font-black text-white tracking-tighter">{currentTime}</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-4">Standard Time</p>
                    </div>
                </div>
            </div>

            {/* 📊 EXECUTIVE STATS */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Force" value={stats.total} />
                    <StatCard label="Active Now" value={stats.activeNow} isPositive />
                    <StatCard label="Away Today" value={stats.absent} isNegative />
                    <StatCard label="In Review" value={stats.leaves} isWarning />
                </div>
            )}

            {/* 🛡️ BIOMETRIC DUTY HUB */}
            <div className="bg-slate-950 rounded-[3rem] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="flex items-center gap-8 relative z-10">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center border border-white/10 text-white text-3xl">
                        <i className="fa-solid fa-fingerprint animate-pulse"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Security Verification</p>
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Duty Control</h2>
                    </div>
                </div>
                <div className="w-full md:w-auto relative z-10">
                    {!todaysLog ? (
                        <button onClick={() => handleBiometricAuth('clock_in')} className="w-full md:w-72 py-6 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Verify & Check-in</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleBiometricAuth('clock_out')} className="w-full md:w-72 py-6 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Verify & Check-out</button>
                    ) : (
                        <div className="w-full md:w-72 py-6 bg-white/5 border border-white/10 text-white/30 rounded-2xl font-black text-[10px] uppercase text-center">Session Finished</div>
                    )}
                </div>
            </div>

            {/* 📊 DYNAMIC ATTENDANCE LOG TABLE */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm overflow-hidden">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10 flex items-center gap-3">
                    <i className={`fa-solid ${isAdmin ? 'fa-users-viewfinder' : 'fa-calendar-days'} text-slate-950`}></i> 
                    {isAdmin ? "Today's Attendance Overview" : "My Monthly Attendance Log"}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                <th className="pb-6">{isAdmin ? "Employee" : "Date"}</th>
                                <th className="pb-6">Check In</th>
                                <th className="pb-6">Check Out</th>
                                <th className="pb-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {attendanceLogs.length > 0 ? attendanceLogs.map((log, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="py-6">
                                        <p className="text-xs font-bold text-slate-900 uppercase">
                                            {isAdmin ? log.name : new Date(log.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                        </p>
                                        {isAdmin && <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID: {log.emp_id}</p>}
                                    </td>
                                    <td className="py-6 font-mono text-[10px] text-slate-500">{log.time_in || '--:--'}</td>
                                    <td className="py-6 font-mono text-[10px] text-slate-500">{log.time_out || '--:--'}</td>
                                    <td className="py-6 text-right">
                                        <span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${log.time_out ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                                            {log.time_out ? 'Finished' : 'On Duty'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="py-10 text-center text-[10px] font-bold text-slate-200 uppercase italic">No records synchronized</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 📢 BOARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <BoardCard title="Notice Board" icon="fa-bullhorn" color="text-orange-500" items={notices} type="notice" />
                <BoardCard title="Upcoming Holidays" icon="fa-calendar-star" color="text-blue-500" items={holidays} type="holiday" />
            </div>
        </div>
    );
}

// Support Components
function StatCard({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center hover:shadow-lg transition-all">
            <div className={`w-1 h-5 rounded-full mb-5 ${isPositive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
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
                )) : <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest italic">No Data Sync</p>}
            </div>
        </div>
    );
}
