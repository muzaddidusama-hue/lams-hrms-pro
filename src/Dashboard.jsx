import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [attendanceLogs, setAttendanceLogs] = useState([]); // এটেনডেন্স লগের জন্য স্টেট
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
            
            // ১. কমন ডাটা ফেচিং
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

            // ২. ডাইনামিক এটেনডেন্স লগ ফেচিং (মেইন পরিবর্তন এখানে)
            let logsQuery = supabase.from('attendance').select('*');

            if (isAdmin) {
                // এডমিন দেখবে আজকের সব এমপ্লয়ীর দিনের হিসাব
                logsQuery = logsQuery.eq('date', todayStr).order('time_in', { ascending: false });
            } else {
                // এমপ্লয়ী দেখবে তার নিজের এ মাসের হিসাব
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
                logsQuery = logsQuery
                    .eq('emp_id', user.emp_id)
                    .gte('date', firstDayOfMonth)
                    .order('date', { ascending: false });
            }

            const { data: logsData } = await logsQuery;
            setAttendanceLogs(logsData || []);

            // ৩. নিজের আজকের স্ট্যাটাস চেক (বাটনের জন্য)
            const { data: myAtt } = await supabase.from('attendance')
                .select('*')
                .eq('emp_id', user.emp_id)
                .eq('date', todayStr)
                .maybeSingle();
            
            setTodaysLog(myAtt || null);
            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // --- Biometric Attendance Logic (আগের মতোই থাকবে) ---
    // ... (handleBiometricAttendance ফাংশনটি এখানে থাকবে)

    return (
        <div className="max-w-[1300px] mx-auto space-y-12 pb-24 px-4">
            
            {/* Header, Stats, এবং Duty Hub আগের মতোই থাকবে */}
            {/* ... (পূর্বের কোড) ... */}

            {/* --- 📊 এটেনডেন্স লগ টেবিল (নিচে যোগ হবে) --- */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                        <i className={`fa-solid ${isAdmin ? 'fa-users-viewfinder' : 'fa-calendar-days'} text-slate-950`}></i> 
                        {isAdmin ? "Today's Attendance Overview" : "My Attendance This Month"}
                    </h3>
                </div>

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
                                <tr>
                                    <td colSpan="4" className="py-10 text-center text-[10px] font-bold text-slate-200 uppercase italic">No activity recorded</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Notice Board এবং Holidays সেকশন আগের মতোই থাকবে */}
            {/* ... (পূর্বের কোড) ... */}
        </div>
    );
}
