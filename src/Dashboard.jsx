import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState('00:00:00');
    const [todaysLog, setTodaysLog] = useState(null);
    const [workDuration, setWorkDuration] = useState('00h 00m 00s');
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loadingAction, setLoadingAction] = useState(false);

    // এডমিন চার্টের স্টেট
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [loginGraphData, setLoginGraphData] = useState([]);
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    // রিয়েল-টাইম ঘড়ি
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        return () => clearInterval(timer); 
    }, []);

    // ডাটা আনা
    useEffect(() => {
        if(user) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        
        // নিজের এটেনডেন্স
        const { data: attData } = await supabase.from('attendance').select('*').eq('date', todayStr).eq('emp_id', user.emp_id).single();
        if(attData) setTodaysLog(attData);

        // নোটিশ ও হলিডে
        const { data: noticeData } = await supabase.from('notices').select('*').order('id', { ascending: false });
        setNotices(noticeData || []);

        const { data: holidayData } = await supabase.from('holidays').select('*');
        if (holidayData) {
            const today = new Date(); today.setHours(0,0,0,0);
            const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
            const displayHolidays = [];
            for(let i=0; i<7; i++) { 
                const d = new Date(); d.setDate(today.getDate() + i); 
                if(d.getDay() === 5) displayHolidays.push({ date: d.toISOString().split('T')[0], occasion: "Weekend (Friday)" }); 
            }
            holidayData.forEach(h => { 
                const hDate = new Date(h.date); 
                if(hDate >= today && hDate <= nextWeek) displayHolidays.push({ date: h.date, occasion: h.occasion }); 
            });
            displayHolidays.sort((a,b) => new Date(a.date) - new Date(b.date));
            setHolidays(displayHolidays);
        }

        // 📊 এডমিনের জন্য গ্রাফের ডাটা ক্যালকুলেশন
        if (isAdmin) {
            const [empRes, allAttRes] = await Promise.all([
                supabase.from('employees').select('emp_id'),
                supabase.from('attendance').select('*').eq('date', todayStr)
            ]);

            const totalEmp = empRes.data?.length || 0;
            const allAtt = allAttRes.data || [];
            const present = allAtt.length;
            const absent = Math.max(0, totalEmp - present);

            // পাই চার্ট ডাটা
            setAttendanceStats([
                { name: 'Present', value: present, color: '#10b981' }, // Green
                { name: 'Absent', value: absent, color: '#f43f5e' }    // Red
            ]);

            // বার চার্ট ডাটা (লগইন টাইম)
            const graphData = allAtt.map(a => {
                const [h, m] = a.time_in.split(':');
                const timeDecimal = parseInt(h) + (parseInt(m) / 60); // 09:30 কে 9.5 বানানো হচ্ছে গ্রাফের জন্য
                
                // 12 hour format for display
                const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
                const displayH = parseInt(h) % 12 || 12;
                const displayTime = `${displayH}:${m} ${ampm}`;

                return { 
                    name: a.name.split(' ')[0], // শুধু ফাস্ট নেম
                    hourVal: parseFloat(timeDecimal.toFixed(2)),
                    exactTime: displayTime 
                };
            });
            setLoginGraphData(graphData);
        }
    };

    useEffect(() => {
        let interval;
        if (todaysLog && todaysLog.time_in && !todaysLog.time_out) {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const start = new Date(`${todayStr}T${todaysLog.time_in}`);
            interval = setInterval(() => {
                const diff = new Date() - start;
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setWorkDuration(`${h.toString().padStart(2,'0')}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`);
            }, 1000);
        } else if (todaysLog && todaysLog.time_out) {
            setWorkDuration("00h 00m 00s");
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
            await fetchDashboardData(); 
        } catch (error) { alert("Connection Error"); } finally { setLoadingAction(false); }
    };

    // Custom Tooltip for Bar Chart
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                    <p className="font-bold mb-1">{payload[0].payload.name}</p>
                    <p className="text-orange-400">Clock In: {payload[0].payload.exactTime}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            
            {/* Top Grid (User Info, Clock, Session) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 text-orange-300">Overview</span>
                        <h2 className="text-4xl font-extrabold tracking-tight mb-2">Hello, {user?.name?.split(' ')[0]}!</h2>
                    </div>
                    <div className="relative z-10 mt-8">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Base Salary</p>
                        <p className="text-3xl font-black text-white">{user?.basic_salary?.toLocaleString()} <span className="text-lg text-orange-500">BDT</span></p>
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xl shadow-xl border border-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter">{currentTime}</h1>
                    <div className="flex items-center gap-2 mt-2 bg-slate-100 px-4 py-1.5 rounded-full">
                        <span className={`w-2.5 h-2.5 rounded-full ${todaysLog && !todaysLog.time_out ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${todaysLog && !todaysLog.time_out ? 'text-green-600' : 'text-slate-500'}`}>
                            {todaysLog && !todaysLog.time_out ? 'Active Session' : 'System Standby'}
                        </span>
                    </div>
                </div>

                <div className="xl:col-span-2 bg-white/95 backdrop-blur-xl shadow-xl border border-slate-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Session</h3>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tighter">{workDuration}</h1>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto justify-center">
                        {!todaysLog ? (
                            <button onClick={() => handleAttendance('clock_in')} disabled={loadingAction} className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase shadow-lg w-full md:w-auto transition-all disabled:opacity-50">
                                {loadingAction ? 'Processing...' : 'Clock In'}
                            </button>
                        ) : !todaysLog.time_out ? (
                            <button onClick={() => handleAttendance('clock_out')} disabled={loadingAction} className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase shadow-lg w-full md:w-auto transition-all disabled:opacity-50">
                                {loadingAction ? 'Processing...' : 'Clock Out'}
                            </button>
                        ) : (
                            <div className="w-full bg-slate-100 text-slate-400 px-10 py-4 rounded-2xl font-bold text-xs uppercase text-center cursor-not-allowed">Shift Completed</div>
                        )}
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xl shadow-xl border border-slate-100 rounded-[2.5rem] p-8 row-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Holidays (Next 7 Days)</h3>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="space-y-3 mb-8">
                        {holidays.length === 0 ? (
                            <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">No upcoming holidays</p></div>
                        ) : (
                            holidays.map((h, i) => (
                                <div key={i} className="flex justify-between items-center bg-orange-50/50 border border-orange-100 p-4 rounded-2xl">
                                    <span className="text-[11px] font-bold text-slate-700">{h.occasion}</span>
                                    <span className="text-[10px] font-black text-orange-500 bg-white px-2 py-1 rounded-lg shadow-sm">{h.date.slice(5)}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Notice Board</h3>
                        </div>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {notices.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">No notices</p></div>
                            ) : (
                                notices.map((n, i) => (
                                    <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                        <h4 className="font-bold text-slate-800 text-xs mb-1">{n.title}</h4>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">{n.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 📊 Admin Charts Section */}
            {isAdmin && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                    
                    {/* Ratio Pie Chart */}
                    <div className="bg-white shadow-xl border border-slate-100 rounded-[2.5rem] p-8 flex flex-col justify-center">
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight mb-6">Today's Attendance Ratio</h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={attendanceStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {attendanceStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="text-center"><span className="w-3 h-3 inline-block rounded-full bg-[#10b981] mr-2"></span><span className="text-xs font-bold text-slate-600">Present ({attendanceStats[0]?.value || 0})</span></div>
                            <div className="text-center"><span className="w-3 h-3 inline-block rounded-full bg-[#f43f5e] mr-2"></span><span className="text-xs font-bold text-slate-600">Absent ({attendanceStats[1]?.value || 0})</span></div>
                        </div>
                    </div>

                    {/* Login Time Bar Chart */}
                    <div className="xl:col-span-2 bg-white shadow-xl border border-slate-100 rounded-[2.5rem] p-8">
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight mb-6">Login Time Analysis</h3>
                        {loginGraphData.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-slate-400 font-bold text-sm">No one has clocked in yet today.</div>
                        ) : (
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={loginGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                                        <YAxis domain={[8, 18]} hide={true} /> {/* 8 AM to 6 PM mapping */}
                                        <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                                        <Bar dataKey="hourVal" fill="#f97316" radius={[6, 6, 6, 6]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}