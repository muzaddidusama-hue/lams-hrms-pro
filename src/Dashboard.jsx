import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [monthlyAttendanceCount, setMonthlyAttendanceCount] = useState(0);
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
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
            
            // ১. কমন ডাটা (Stats, Notices, Holidays)
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

            // ২. এমপ্লয়ীর জন্য মাসিক উপস্থিতির সংখ্যা বের করা
            if (!isAdmin) {
                const { count } = await supabase.from('attendance')
                    .select('*', { count: 'exact', head: true })
                    .eq('emp_id', user.emp_id)
                    .gte('date', firstDayOfMonth);
                setMonthlyAttendanceCount(count || 0);
            }

            // ৩. নিজের আজকের চেক-ইন স্ট্যাটাস (বাটনের জন্য)
            const { data: myAtt } = await supabase.from('attendance')
                .select('*')
                .eq('emp_id', user.emp_id)
                .eq('date', todayStr)
                .maybeSingle();
            
            setTodaysLog(myAtt || null);
            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

        } catch (error) {
            console.error("Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- 🛡️ BIOMETRIC FINGERPRINT AUTH ---
    const handleBiometricAuth = async (action) => {
        if (!window.PublicKeyCredential) return alert("Biometric not supported on this device/browser.");
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const options = {
                publicKey: {
                    challenge,
                    rp: { name: "LAMS Power" },
                    user: { id: Uint8Array.from(user.id, c => c.charCodeAt(0)), name: user.email, displayName: user.name },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: { authenticatorAttachment: "platform" },
                    timeout: 60000,
                }
            };
            const credential = await navigator.credentials.create(options);
            if (credential) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-CA');
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                if (action === 'clock_in') {
                    await supabase.from('attendance').insert([{ emp_id: user.emp_id, name: user.name, date: dateStr, time_in: timeStr }]);
                } else {
                    await supabase.from('attendance').update({ time_out: timeStr }).eq('emp_id', user.emp_id).eq('date', dateStr);
                }
                fetchDashboardData();
            }
        } catch (err) { console.error("Auth Failed", err); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-200 tracking-[0.5em] animate-pulse">LAMS POWER</div>;

    return (
        <div className="max-w-[1300px] mx-auto space-y-12 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            
            {/* 👑 PREMIUM HEADER */}
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-12 relative overflow-hidden">
                <div className="relative z-10 text-center lg:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 mb-3 italic">Enterprise Portal</p>
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                        Assalamu Alaikum,<br/><span className="text-slate-400 font-normal italic">{user?.name}</span>
                    </h1>
                </div>
                <div className="p-12 bg-slate-950 rounded-[3.5rem] shadow-2xl min-w-[320px] text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10">
                        <h2 className="text-6xl font-black text-white tracking-tighter font-mono">{currentTime}</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-4">Standard Time</p>
                    </div>
                </div>
            </div>

            {/* 📊 ANALYTICS STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdmin ? (
                    <>
                        <StatCard label="Total Force" value={stats.total} />
                        <StatCard label="Live Now" value={stats.activeNow} isPositive />
                        <StatCard label="Away Today" value={stats.absent} isNegative />
                        <StatCard label="In Review" value={stats.leaves} isWarning />
                    </>
                ) : (
                    <>
                        <StatCard label="Present (This Month)" value={monthlyAttendanceCount} isPositive />
                        <StatCard label="Duty Status" value={todaysLog ? "Active" : "Offline"} isPositive={todaysLog} isNegative={!todaysLog} />
                        <StatCard label="My Profile" value="OK" />
                        <StatCard label="Notifications" value={notices.length} />
                    </>
                )}
            </div>

            {/* 🛡️ BIOMETRIC DUTY CONTROL */}
            <div className="bg-slate-950 rounded-[2.5rem] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="flex items-center gap-8 relative z-10">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-3xl flex items-center justify-center border border-white/10 text-white text-3xl transition-transform group-hover:scale-110 duration-500">
                        <i className="fa-solid fa-fingerprint animate-pulse"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic underline underline-offset-8 decoration-slate-800">Security Gate</p>
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Biometric Hub</h2>
                    </div>
                </div>
                <div className="w-full md:w-auto relative z-10">
                    {!todaysLog ? (
                        <button onClick={() => handleBiometricAuth('clock_in')} className="w-full md:w-72 py-6 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-slate-100 active:scale-95 transition-all">Verify & Check-in</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleBiometricAuth('clock_out')} className="w-full md:w-72 py-6 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-red-600 active:scale-95 transition-all">Verify & Check-out</button>
                    ) : (
                        <div className="w-full md:w-72 py-6 bg-white/5 border border-white/10 text-white/30 rounded-2xl font-black text-[10px] uppercase text-center tracking-widest italic">Session Completed</div>
                    )}
                </div>
            </div>

            {/* 📢 INFORMATION BOARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <BoardCard title="Notice Board" icon="fa-bullhorn" color="text-orange-500" items={notices} type="notice" />
                <BoardCard title="Upcoming Holidays" icon="fa-calendar-star" color="text-blue-500" items={holidays} type="holiday" />
            </div>
        </div>
    );
}

// UI Components
function StatCard({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300">
            <div className={`w-1 h-5 rounded-full mb-6 ${isPositive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-100'}`}></div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                {typeof value === 'number' ? value.toString().padStart(2, '0') : value}
            </p>
        </div>
    );
}

function BoardCard({ title, icon, color, items, type }) {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-sm min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-10 flex items-center gap-3">
                <i className={`fa-solid ${icon} ${color}`}></i> {title}
            </h3>
            <div className="space-y-6">
                {items.length > 0 ? items.map((item, idx) => (
                    <div key={idx} className={`${type === 'notice' ? 'p-6 bg-slate-50 border-l-4 border-slate-950' : 'flex justify-between p-4 border-b border-slate-50'} rounded-2xl`}>
                        {type === 'notice' ? (
                            <>
                                <p className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tight">{item.title}</p>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.message}</p>
                            </>
                        ) : (
                            <>
                                <span className="font-bold text-slate-800 text-xs">{item.occasion}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400">{item.date}</span>
                            </>
                        )}
                    </div>
                )) : <p className="text-[10px] font-bold text-slate-200 uppercase italic">No Synchronized Data</p>}
            </div>
        </div>
    );
}
