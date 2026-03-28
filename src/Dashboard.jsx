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
            
            // ডাটা ফেচিং (আগের মতো)
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

            // নিজের আজকের এটেনডেন্স
            const { data: myAtt } = await supabase.from('attendance')
                .select('*')
                .eq('emp_id', user.emp_id)
                .eq('date', todayStr)
                .maybeSingle();
            
            setTodaysLog(myAtt || null);

        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- 🛡️ BIOMETRIC FINGERPRINT LOGIC (New Addition) ---
    const handleBiometricAttendance = async (action) => {
        // ১. ব্রাউজার সাপোর্ট চেক
        if (!window.PublicKeyCredential) {
            alert("আপনার ডিভাইস বা ব্রাউজারে ফিঙ্গারপ্রিন্ট ভেরিফিকেশন সাপোর্ট করে না।");
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const options = {
                publicKey: {
                    challenge,
                    rp: { name: "LAMS Power" },
                    user: {
                        id: Uint8Array.from(user.id, c => c.charCodeAt(0)),
                        name: user.email,
                        displayName: user.name,
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: { authenticatorAttachment: "platform" },
                    timeout: 60000,
                }
            };

            // ২. মোবাইলের ফিঙ্গারপ্রিন্ট সেন্সর উইন্ডো ওপেন হবে
            const credential = await navigator.credentials.create(options);

            if (credential) {
                // ৩. ভেরিফিকেশন সাকসেস হলে ডাটাবেজে এন্ট্রি হবে
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-CA');
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                
                if (action === 'clock_in') {
                    await supabase.from('attendance').insert([{ emp_id: user.emp_id, name: user.name, date: dateStr, time_in: timeStr }]);
                    alert("ফিঙ্গারপ্রিন্ট ভেরিফাইড। চেক-ইন সফল! 🛡️");
                } else {
                    await supabase.from('attendance').update({ time_out: timeStr }).eq('emp_id', user.emp_id).eq('date', dateStr);
                    alert("ফিঙ্গারপ্রিন্ট ভেরিফাইড। চেক-আউট সফল! 🛡️");
                }
                fetchDashboardData();
            }
        } catch (err) {
            console.error("Biometric Error:", err);
            // যদি ইউজার ক্যানসেল করে বা ভুল ফিঙ্গার দেয়, কোনো ডাটা ইনসার্ট হবে না।
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-200 animate-pulse tracking-[0.4em]">SYNCING LAMS...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            
            {/* 👑 Welcome Header (আগের সেই প্রিমিয়াম UI) */}
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-12">
                <div className="text-center lg:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-3">Lams Power Workspace</p>
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.2] tracking-tighter">
                        Assalamu Alaikum,<br/><span className="text-slate-400 italic font-normal">{user?.name}</span>
                    </h1>
                </div>
                <div className="p-12 bg-slate-950 rounded-[3rem] shadow-2xl min-w-[300px] text-center relative overflow-hidden group">
                    {/* Carbon Fiber subtle texture effect */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10">
                        <h2 className="text-5xl font-black text-white tracking-tighter">{currentTime}</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-4">Standard Time</p>
                    </div>
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

            {/* 🛡️ Duty Control (আগের UI, সাথে ফিঙ্গারপ্রিন্ট ভেরিফিকেশন) */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex items-center gap-8 text-center md:text-left">
                    <div className="w-20 h-20 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all group-hover:scale-105 duration-500">
                        {/* আইকন পাল্টে ফিঙ্গারপ্রিন্ট দেওয়া হয়েছে কিন্তু স্টাইল এক */}
                        <i className="fa-solid fa-fingerprint text-2xl animate-pulse text-white"></i>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Session</p>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Biometric Duty Hub</h2>
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    {!todaysLog ? (
                        <button 
                            onClick={() => handleBiometricAttendance('clock_in')} 
                            className="w-full md:w-80 h-16 bg-slate-950 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <i className="fa-solid fa-shield-check"></i> Verify & Start Duty
                        </button>
                    ) : !todaysLog.time_out ? (
                        <button 
                            onClick={() => handleBiometricAttendance('clock_out')} 
                            className="w-full md:w-80 h-16 bg-red-500 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <i className="fa-solid fa-fingerprint"></i> Verify & End Duty
                        </button>
                    ) : (
                        <div className="w-full md:w-80 h-16 bg-slate-100 text-slate-400 rounded-[1.8rem] font-black text-xs uppercase border border-slate-200 flex items-center justify-center gap-3 cursor-not-allowed">
                            <i className="fa-solid fa-check-circle"></i> Shift Finished Today
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

// Stats Card Component (Unchanged UI)
function ExecutiveStat({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 flex flex-col items-center text-center transition-all h-full hover:shadow-lg duration-500">
            <div className={`w-1 h-5 rounded-full mb-5 ${isPositive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{value.toString().padStart(2, '0')}</p>
        </div>
    );
}
