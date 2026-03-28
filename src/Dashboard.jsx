import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0 });
    const [todaysLog, setTodaysLog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        fetchDashboardData();
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = async () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const { data: myAtt } = await supabase.from('attendance')
            .select('*')
            .eq('emp_id', user.emp_id)
            .eq('date', todayStr)
            .maybeSingle();
        setTodaysLog(myAtt || null);
        setLoading(false);
    };

    // --- 🛡️ BIOMETRIC FINGERPRINT LOGIC ---
    const handleBiometricAuth = async (action) => {
        if (!window.PublicKeyCredential) {
            alert("আপনার ব্রাউজারে ফিঙ্গারপ্রিন্ট সাপোর্ট করে না।");
            return;
        }

        try {
            // ১. ফিঙ্গারপ্রিন্ট প্রম্পট দেখানো (WebAuthn)
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const options = {
                publicKey: {
                    challenge,
                    rp: { name: "Lams Power" },
                    user: {
                        id: Uint8Array.from(user.id, c => c.charCodeAt(0)),
                        name: user.email,
                        displayName: user.name,
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: { authenticatorAttachment: "platform" }, // এটা মোবাইলের বিল্ট-ইন স্ক্যানার কল করবে
                    timeout: 60000,
                }
            };

            // মোবাইলের ফিঙ্গারপ্রিন্ট উইন্ডো ওপেন হবে
            const credential = await navigator.credentials.create(options);

            if (credential) {
                // ২. ফিঙ্গারপ্রিন্ট সাকসেস হলে এটেনডেন্স লজিক রান হবে
                processAttendance(action);
            }
        } catch (err) {
            console.error("Biometric Error:", err);
            alert("ফিঙ্গারপ্রিন্ট ভেরিফিকেশন ব্যর্থ হয়েছে বা বাতিল করা হয়েছে।");
        }
    };

    const processAttendance = async (action) => {
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
            alert("Check-in Successful via Fingerprint! 🛡️");
        } else {
            await supabase.from('attendance').update({ time_out: timeStr })
                .eq('emp_id', user.emp_id)
                .eq('date', dateStr);
            alert("Check-out Successful via Fingerprint! 🛡️");
        }
        fetchDashboardData();
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-200">SYNCING LAMS...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-24 px-4">
            {/* Header Section */}
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50 flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                    Welcome back,<br/><span className="text-slate-400 italic font-normal">{user?.name}</span>
                </h1>
                <div className="text-right">
                    <h2 className="text-4xl font-black text-slate-950">{currentTime}</h2>
                </div>
            </div>

            {/* --- PREMIMUM BIOMETRIC HUB --- */}
            <div className="bg-slate-950 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-3xl rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-2xl">
                        <i className="fa-solid fa-fingerprint text-4xl text-white animate-pulse"></i>
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Biometric Session</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Secure Attendance with Device Fingerprint</p>
                    </div>

                    <div className="w-full max-w-sm">
                        {!todaysLog ? (
                            <button 
                                onClick={() => handleBiometricAuth('clock_in')} 
                                className="w-full py-6 bg-white text-slate-950 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <i className="fa-solid fa-shield-check"></i> Verify & Check-in
                            </button>
                        ) : !todaysLog.time_out ? (
                            <button 
                                onClick={() => handleBiometricAuth('clock_out')} 
                                className="w-full py-6 bg-red-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <i className="fa-solid fa-fingerprint"></i> Verify & Check-out
                            </button>
                        ) : (
                            <div className="w-full py-6 bg-white/5 border border-white/10 text-white/40 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                                <i className="fa-solid fa-circle-check"></i> Shift Finished
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
