// Dashboard.jsx এর ভেতরে stats ক্যালকুলেশন অংশে এই লজিকটি দিন
const fetchDashboardData = async () => {
    // ... আপনার আগের কোড ...
    
    if (isAdmin) {
        // 🚀 অপ্টিমাইজড কুয়েরি: একবারে কাউন্ট নিয়ে আসা
        const todayStr = new Date().toLocaleDateString('en-CA');
        const [empCount, attCount, attRows] = await Promise.all([
            supabase.from('employees').select('emp_id', { count: 'exact', head: true }),
            supabase.from('attendance').select('emp_id', { count: 'exact', head: true }).eq('date', todayStr),
            supabase.from('attendance').select('name, time_in').eq('date', todayStr)
        ]);

        const total = empCount.count || 0;
        const present = attCount.count || 0;
        const absent = Math.max(0, total - present);

        setAttendanceStats([
            { name: 'Present', value: present, color: '#10b981' },
            { name: 'Absent', value: absent, color: '#f43f5e' }
        ]);
        
        // বার চার্টের জন্য ডাটা প্রসেসিং দ্রুত করা হয়েছে
        setLoginGraphData(attRows.data?.map(a => ({
            name: a.name.split(' ')[0],
            hourVal: parseFloat(a.time_in.split(':')[0]) + (parseInt(a.time_in.split(':')[1]) / 60),
            exactTime: a.time_in
        })) || []);
    }
};

// ... JSX এর ভেতরে PieChart আপডেট ...
<Pie 
    data={attendanceStats} 
    innerRadius={60} 
    outerRadius={80} 
    paddingAngle={5} 
    dataKey="value"
    animationDuration={800} // স্মুথ অ্যানিমেশন
    animationBegin={200}
>
    {attendanceStats.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
    ))}
</Pie>
