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

        // 🚀 ফিক্স: Date কলামের জন্য সঠিক ফিল্টার (1 তারিখ থেকে মাসের শেষ দিন পর্যন্ত)
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
                const isFriday = new Date(dateStr).getDay() === 5;
                const alreadyAdded = combinedHolidays.some(h => h.date === dateStr);
                if (isFriday && !alreadyAdded) {
                    combinedHolidays.push({ date: dateStr, occasion: "Weekend (Friday)" });
                }
            }

            const calculatedData = employees.map(emp => {
                // 🚀 ফিক্স: ID গুলোকে String বানিয়ে মেলানো হচ্ছে যাতে কোনো মিসম্যাচ না হয়
                const empAtt = attendance.filter(a => String(a.emp_id) === String(emp.emp_id));
                const uniqueDays = new Set(empAtt.map(a => a.date)).size; 
                
                const empLeaves = leaves.filter(l => String(l.emp_id) === String(emp.emp_id)).length; 

                const adjKey = `${emp.emp_id}_${selectedMonth}`;
                const localAdj = JSON.parse(localStorage.getItem('lams_manual_adj')) || {};
                const finalPresence = localAdj[adjKey] !== undefined ? parseFloat(localAdj[adjKey]) : uniqueDays;

                const totalPaidDays = finalPresence + combinedHolidays.length + empLeaves;
                let netPayable = Math.round((emp.basic_salary / daysInMonth) * totalPaidDays);
                if(netPayable > emp.basic_salary) netPayable = emp.basic_salary;

                return {
                    ...emp,
                    presence: finalPresence,
                    holidays: combinedHolidays.length,
                    leaves: empLeaves,
                    netPayable: netPayable
                };
            });

            if (!isAdmin) {
                setPayrollData(calculatedData.filter(d => String(d.emp_id) === String(user.emp_id)));
            } else {
                setPayrollData(calculatedData);
            }

        } catch (error) {
            console.error("Error fetching payroll:", error);
        } finally {
            setLoading(false);
        }
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

        const el = document.createElement('div');
        el.style.padding = '40px';
        
        let tableRows = payrollData.map(row => `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px;font-weight:600;color:#1e293b;">${row.name}<br><span style="font-size:9px;color:#94a3b8;">ID: ${row.emp_id}</span></td>
                <td style="padding:12px;">${row.basic_salary?.toLocaleString()} ৳</td>
                <td style="padding:12px;text-align:center;">${row.presence} Days</td>
                <td style="padding:12px;text-align:center;color:#ea580c;font-weight:bold;">${row.holidays} Days</td>
                <td style="padding:12px;text-align:center;color:#16a34a;font-weight:bold;">${row.leaves} Days</td>
                <td style="padding:12px;text-align:right;font-weight:800;color:#0f172a;">${row.netPayable?.toLocaleString()} ৳</td>
            </tr>
        `).join('');

        if (payrollData.length === 0) {
            tableRows = `<tr><td colspan="6" style="padding:20px;text-align:center;color:#64748b;">No data available for this month</td></tr>`;
        }

        el.innerHTML = `
            <div style="text-align:center;margin-bottom:40px;border-bottom:2px solid #ea580c;padding-bottom:20px;">
                <h1 style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-1px;margin:0;">LAMS POWER</h1>
                <p style="font-size:12px;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin-top:5px;">Official Payroll Sheet</p>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:30px;">
                <div style="font-size:12px;font-weight:bold;color:#334155;">Statement: <span style="color:#ea580c;">${displayMonthName}</span></div>
                <div style="font-size:12px;font-weight:bold;color:#334155;">Generated: ${new Date().toLocaleDateString()}</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:11px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:12px;text-align:left;border-bottom:2px solid #cbd5e1;white-space:nowrap;">EMPLOYEE</th>
                        <th style="padding:12px;text-align:left;border-bottom:2px solid #cbd5e1;white-space:nowrap;">BASIC</th>
                        <th style="padding:12px;text-align:center;border-bottom:2px solid #cbd5e1;white-space:nowrap;">ATTENDED</th>
                        <th style="padding:12px;text-align:center;border-bottom:2px solid #cbd5e1;white-space:nowrap;">HOLIDAYS</th>
                        <th style="padding:12px;text-align:center;border-bottom:2px solid #cbd5e1;white-space:nowrap;">LEAVES</th>
                        <th style="padding:12px;text-align:right;border-bottom:2px solid #cbd5e1;white-space:nowrap;">NET PAYABLE</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div style="margin-top:80px;display:flex;justify-content:space-between;padding-top:20px;">
                <div style="text-align:center;">
                    <div style="border-top:2px solid #0f172a;width:180px;margin-bottom:8px;"></div>
                    <p style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#0f172a;">COO, LAMS Power</p>
                </div>
                <div style="text-align:center;">
                    <div style="border-top:2px solid #0f172a;width:180px;margin-bottom:8px;"></div>
                    <p style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#0f172a;">Accounts Approval</p>
                </div>
            </div>
        `;

        const opt = {
            margin:       0.5,
            filename:     `LAMS_Payroll_${selectedMonth}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(el).save().then(() => {
            setIsDownloading(false);
        });
    };

    return (
        <div className="max-w-7xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{isAdmin ? 'Payroll Management' : 'My Payslip'}</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Statement for {displayMonthName}</p>
                </div>
                <div className="flex gap-4">
                    <input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)} 
                        className="p-3 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 cursor-pointer focus:border-orange-500"
                    />
                    <button 
                        onClick={downloadPDF} 
                        disabled={isDownloading || loading}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:bg-slate-400"
                    >
                        {isDownloading ? (
                            <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Generating...</>
                        ) : (
                            <><i className="fa-solid fa-file-pdf mr-2"></i> Download PDF</>
                        )}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center"><div className="border-4 border-slate-200 border-t-orange-500 rounded-full w-10 h-10 animate-spin mx-auto"></div></div>
            ) : (
                <div className="bg-white rounded-[2.5rem] overflow-hidden overflow-x-auto shadow-sm border border-slate-100">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-4 whitespace-nowrap">Employee</th>
                                <th className="p-4 whitespace-nowrap">Basic Salary</th>
                                <th className="p-4 text-center whitespace-nowrap">Attended</th>
                                <th className="p-4 text-center whitespace-nowrap">Holidays</th>
                                <th className="p-4 text-center whitespace-nowrap">Paid Leave</th>
                                <th className="p-4 text-right whitespace-nowrap">Net Payable</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {payrollData.map((row) => (
                                <tr key={row.emp_id} className="hover:bg-orange-50/20 transition-colors">
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="font-bold text-slate-800 text-sm">{row.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">ID: {row.emp_id}</div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-600 whitespace-nowrap">{row.basic_salary?.toLocaleString()} ৳</td>
                                    <td className="p-4 text-center whitespace-nowrap">
                                        {isAdmin ? (
                                            <input 
                                                type="number" 
                                                step="0.5" 
                                                value={row.presence} 
                                                onChange={(e) => handleManualAdj(row.emp_id, e.target.value)} 
                                                className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-700 outline-none focus:border-orange-500 transition-colors"
                                            />
                                        ) : (
                                            <span className="font-bold text-slate-700">{row.presence} Days</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center text-sm font-bold text-orange-500 whitespace-nowrap">{row.holidays} Days</td>
                                    <td className="p-4 text-center text-sm font-bold text-green-600 whitespace-nowrap">{row.leaves} Days</td>
                                    <td className="p-4 text-right font-black text-slate-800 text-lg whitespace-nowrap">{row.netPayable?.toLocaleString()} ৳</td>
                                </tr>
                            ))}
                            {payrollData.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No data available for this month</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}