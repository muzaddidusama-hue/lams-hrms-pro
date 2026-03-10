import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Payroll({ user }) {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [manualAdj, setManualAdj] = useState({});
    const [isDownloading, setIsDownloading] = useState(false);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';
    const [yearStr, monthStr] = selectedMonth.split('-');
    const displayMonthName = new Date(yearStr, Number(monthStr) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    useEffect(() => {
        fetchPayroll();
        const savedAdj = JSON.parse(localStorage.getItem('lams_manual_adj')) || {};
        setManualAdj(savedAdj);
    }, [selectedMonth]);

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

            let combinedHolidays = [...holidays];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (new Date(dateStr).getDay() === 5 && !combinedHolidays.some(h => h.date === dateStr)) {
                    combinedHolidays.push({ date: dateStr, occasion: "Weekend" });
                }
            }

            const calculatedData = employees.map(emp => {
                const empAtt = attendance.filter(a => String(a.emp_id) === String(emp.emp_id));
                const uniqueDays = new Set(empAtt.map(a => a.date)).size; 
                const empLeaves = leaves.filter(l => String(l.emp_id) === String(emp.emp_id)).length; 
                const adjKey = `${emp.emp_id}_${selectedMonth}`;
                const finalPresence = manualAdj[adjKey] !== undefined ? parseFloat(manualAdj[adjKey]) : uniqueDays;
                const totalPaidDays = finalPresence + combinedHolidays.length + empLeaves;
                let netPayable = Math.round((emp.basic_salary / daysInMonth) * totalPaidDays);
                return { ...emp, presence: finalPresence, holidays: combinedHolidays.length, leaves: empLeaves, netPayable: Math.min(netPayable, emp.basic_salary) };
            });

            setPayrollData(isAdmin ? calculatedData : calculatedData.filter(d => String(d.emp_id) === String(user.emp_id)));
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    const handleManualAdj = (empId, val) => {
        const adjKey = `${empId}_${selectedMonth}`;
        const newAdj = { ...manualAdj, [adjKey]: val };
        setManualAdj(newAdj);
        localStorage.setItem('lams_manual_adj', JSON.stringify(newAdj));
        fetchPayroll(); 
    };

    const downloadPDF = () => {
        setIsDownloading(true);
        const el = document.createElement('div'); el.style.padding = '40px';
        const tableRows = payrollData.map(row => `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px;">${row.name}<br><span style="font-size:9px;color:#94a3b8;">ID: ${row.emp_id}</span></td><td style="padding:12px;">${row.basic_salary?.toLocaleString()} ৳</td><td style="padding:12px;text-align:center;">${row.presence} Days</td><td style="padding:12px;text-align:center;">${row.holidays} Days</td><td style="padding:12px;text-align:center;">${row.leaves} Days</td><td style="padding:12px;text-align:right;font-weight:800;">${row.netPayable?.toLocaleString()} ৳</td></tr>`).join('');
        el.innerHTML = `<div style="text-align:center;border-bottom:2px solid #ea580c;padding-bottom:20px;"><h1 style="font-size:24px;">LAMS POWER</h1><p>Payroll - ${displayMonthName}</p></div><table style="width:100%;border-collapse:collapse;margin-top:20px;"><thead><tr style="background:#f1f5f9;"><th>EMPLOYEE</th><th>BASIC</th><th>ATTENDED</th><th>HOLIDAYS</th><th>LEAVES</th><th style="text-align:right;">NET PAYABLE</th></tr></thead><tbody>${tableRows}</tbody></table><div style="margin-top:80px;display:flex;justify-content:space-between;"><div><p>___________________</p><p>COO, LAMS Power</p></div><div><p>___________________</p><p>Accounts Approval</p></div></div>`;
        window.html2pdf().set({ margin:0.5, filename:`LAMS_Payroll_${selectedMonth}.pdf`, html2canvas:{scale:2}, jsPDF:{unit:'in',format:'a4',orientation:'portrait'} }).from(el).save().then(() => setIsDownloading(false));
    };

    return (
        <div className="max-w-7xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                <div><h3 className="text-xl md:text-2xl font-extrabold text-slate-900">{isAdmin ? 'Payroll' : 'My Payslip'}</h3><p className="text-xs font-medium text-slate-400 mt-1 uppercase">Statement for {displayMonthName}</p></div>
                <div className="flex gap-4 w-full md:w-auto"><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-3 rounded-xl border border-slate-200 outline-none flex-1 md:flex-none" /><button onClick={downloadPDF} disabled={isDownloading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase flex-1 md:flex-none">{isDownloading ? '...' : 'PDF'}</button></div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[750px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-4 whitespace-nowrap">Employee</th><th className="p-4 whitespace-nowrap">Basic</th><th className="p-4 text-center whitespace-nowrap">Attended</th><th className="p-4 text-center whitespace-nowrap">Holidays</th><th className="p-4 text-center whitespace-nowrap">Leaves</th><th className="p-4 text-right whitespace-nowrap">Net Payable</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {payrollData.map((row) => (
                                <tr key={row.emp_id} className="hover:bg-orange-50/20 transition-colors">
                                    <td className="p-4 whitespace-nowrap"><div className="font-bold text-slate-800 text-sm">{row.name}</div><div className="text-[9px] text-slate-400 mt-0.5">ID: {row.emp_id}</div></td>
                                    <td className="p-4 font-bold text-slate-600 whitespace-nowrap">{row.basic_salary?.toLocaleString()} ৳</td>
                                    <td className="p-4 text-center whitespace-nowrap">{isAdmin ? <input type="number" step="0.5" value={row.presence} onChange={(e) => handleManualAdj(row.emp_id, e.target.value)} className="w-14 p-2 bg-slate-50 border rounded-lg text-center font-bold text-xs" /> : <span>{row.presence} Days</span>}</td>
                                    <td className="p-4 text-center text-sm font-bold text-orange-500 whitespace-nowrap">{row.holidays} Days</td>
                                    <td className="p-4 text-center text-sm font-bold text-green-600 whitespace-nowrap">{row.leaves} Days</td>
                                    <td className="p-4 text-right font-black text-slate-800 text-lg whitespace-nowrap">{row.netPayable?.toLocaleString()} ৳</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
