import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Payroll({ user }) {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';
    const [yearStr, monthStr] = selectedMonth.split('-');
    const displayMonthName = new Date(yearStr, Number(monthStr) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    useEffect(() => { fetchPayroll(); }, [selectedMonth]);

    const fetchPayroll = async () => {
        setLoading(true);
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-${daysInMonth}`;

        try {
            const [empRes, attRes, holRes, leaveRes] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate),
                supabase.from('holidays').select('*').gte('date', startDate).lte('date', endDate),
                supabase.from('leaves').select('*').eq('status', 'Approved').gte('date', startDate).lte('date', endDate)
            ]);

            const employees = empRes.data || [];
            const attendance = attRes.data || [];
            const holidays = holRes.data || [];
            const leaves = leaveRes.data || [];

            let combinedHolidays = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (new Date(dateStr).getDay() === 5) combinedHolidays.push(dateStr);
            }
            holidays.forEach(h => { if(!combinedHolidays.includes(h.date)) combinedHolidays.push(h.date); });

            const calculatedData = employees.map(emp => {
                const empAtt = attendance.filter(a => String(a.emp_id) === String(emp.emp_id));
                const uniqueDays = new Set(empAtt.map(a => a.date)).size; 
                const empLeaves = leaves.filter(l => String(l.emp_id) === String(emp.emp_id)).length; 
                const adjKey = `${emp.emp_id}_${selectedMonth}`;
                const localAdj = JSON.parse(localStorage.getItem('lams_manual_adj')) || {};
                const finalPresence = localAdj[adjKey] !== undefined ? parseFloat(localAdj[adjKey]) : uniqueDays;
                const totalPaidDays = finalPresence + combinedHolidays.length + empLeaves;
                let netPayable = Math.round((emp.basic_salary / daysInMonth) * totalPaidDays);
                return { ...emp, presence: finalPresence, holidays: combinedHolidays.length, leaves: empLeaves, netPayable: Math.min(netPayable, emp.basic_salary) };
            });

            setPayrollData(isAdmin ? calculatedData : calculatedData.filter(d => String(d.emp_id) === String(user.emp_id)));
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out] pb-10">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="text-center md:text-left">
                    <h3 className="text-xl font-extrabold text-slate-900">Payroll</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{displayMonthName}</p>
                </div>
                <div className="flex gap-2">
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" />
                    <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase shadow-lg"><i className="fa-solid fa-print"></i></button>
                </div>
            </div>

            {/* 📱 Mobile Optimized Payroll Cards */}
            <div className="grid grid-cols-1 gap-4">
                {payrollData.map((row) => (
                    <div key={row.emp_id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <div>
                                <h4 className="font-bold text-slate-800 text-base">{row.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold">ID: {row.emp_id}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Net Payable</p>
                                <p className="text-xl font-black text-orange-600">{row.netPayable?.toLocaleString()} ৳</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Attended</p>
                                <p className="text-xs font-bold text-slate-700">{row.presence}d</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Holidays</p>
                                <p className="text-xs font-bold text-slate-700">{row.holidays}d</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Leaves</p>
                                <p className="text-xs font-bold text-slate-700">{row.leaves}d</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                            <p className="text-[10px] font-bold text-orange-800">Basic Salary</p>
                            <p className="text-sm font-black text-orange-900">{row.basic_salary?.toLocaleString()} ৳</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
