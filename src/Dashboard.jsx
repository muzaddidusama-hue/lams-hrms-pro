import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function Dashboard({ user }) {
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leaves: 0 });
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [loginGraphData, setLoginGraphData] = useState([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = useMemo(() => 
        user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin', 
    [user]);

    useEffect(() => {
        fetchDashboardData();
    }, [user, isAdmin]);

    const fetchDashboardData = async () => {
        setLoading(true);
        const todayStr = new Date().toLocaleDateString('en-CA');

        try {
            if (isAdmin) {
                // 🚀 সুপার ফাস্ট কুয়েরি: একবারে সব ডাটা কাউন্ট করা হচ্ছে
                const [empCount, attCount, leaveCount, attRows] = await Promise.all([
                    supabase.from('employees').select('*', { count: 'exact', head: true }),
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
                    supabase.from('attendance').select('name, time_in').eq('date', todayStr).limit(10)
                ]);

                const total = empCount.count || 0;
                const present = attCount.count || 0;
                const absent = Math.max(0, total - present);

                setStats({ total, present, absent, leaves: leaveCount.count || 0 });
                
                // চার্টের জন্য ডাটা সেট করা (অ্যানিমেশন ফাস্ট করা হয়েছে)
                setAttendanceStats([
                    { name: 'Present', value: present, color: '#10b981' },
                    { name: 'Absent', value: absent, color: '#f43f5e' }
                ]);

                setLoginGraphData(attRows.data?.map(a => ({
                    name: a.name.split(' ')[0],
                    hour: parseFloat(a.time_in.split(':')[0]) + (parseInt(a.time_in.split(':')[1]) / 60)
                })) || []);

            } else {
                // এমপ্লয়ী সাইডের জন্য কুইক ডাটা
                const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', user.emp_id).eq('date', todayStr).single();
                setStats({ isPresent: !!myAtt, timeIn: myAtt?.time_in || '--:--' });
            }
        } catch (error) {
            console.error("Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 font-bold animate-pulse">LOADING DASHBOARD...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out] pb-10">
            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isAdmin ? (
                    <>
                        <StatCard label="Total Staff" value={stats.total} color="text-slate-800" />
                        <StatCard label="Present" value={stats.present} color="text-green-600" />
                        <StatCard label="Absent" value={stats.absent} color="text-red-500" />
                        <StatCard label="Pending Leaves" value={stats.leaves} color="text-orange-500" />
                    </>
                ) : (
                    <>
                        <StatCard label="Today Status" value={stats.isPresent ? 'PRESENT' : 'ABSENT'} color={stats.isPresent ? 'text-green-600' : 'text-red-500'} />
                        <StatCard label="Clock In" value={stats.timeIn} color="text-slate-800" />
                    </>
                )}
            </div>

            {/* Charts Section */}
            {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Attendance Ratio</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={attendanceStats} 
                                        innerRadius={60} 
                                        outerRadius={90} 
                                        paddingAngle={8} 
                                        dataKey="value"
                                        animationDuration={500} // এখানে ৫ সেকেন্ড থেকে কমিয়ে ০.৫ সেকেন্ড করা হয়েছে
                                    >
                                        {attendanceStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                            {attendanceStats.map(s => (
                                <div key={s.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }}></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}: {s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Today's Entry Flow</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={loginGraphData}>
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis hide domain={[7, 12]} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="hour" fill="#e2e8f0" radius={[10, 10, 10, 10]} barSize={20} animationDuration={1000} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
    );
}
