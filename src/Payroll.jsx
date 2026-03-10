import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Payroll({ user }) {
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const calculatePayroll = async () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

            const [emp, att, leaf, hol] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('attendance').select('*').gte('date', start).lte('date', end),
                supabase.from('leaves').select('*').eq('status', 'Approved').gte('date', start).lte('date', end),
                supabase.from('holidays').select('*').gte('date', start).lte('date', end)
            ]);

            let fridays = 0; let d = new Date(start); while (d <= new Date(end)) { if (d.getDay() === 5) fridays++; d.setDate(d.getDate() + 1); }

            const res = (emp.data || []).map(e => {
                const present = att.data?.filter(a => a.emp_id === e.emp_id).length || 0;
                const approvedLeaves = leaf.data?.filter(l => l.emp_id === e.emp_id).length || 0;
                const officeHolidays = hol.data?.length || 0;
                
                const paidDays = present + fridays + approvedLeaves + officeHolidays;
                const absent = Math.max(0, totalDaysInMonth - paidDays);
                const basic = parseFloat(e.basic_salary || 0);
                const net = Math.round((basic / totalDaysInMonth) * paidDays);

                return { ...e, totalDaysInMonth, present, fridays, approvedLeaves, officeHolidays, absent, paidDays, net };
            });

            setPayrollData(isAdmin ? res : res.filter(p => p.emp_id === user.emp_id));
            setLoading(false);
        };
        calculatePayroll();
    }, [user, isAdmin]);

    const downloadSalarySheet = () => {
        const doc = new jsPDF('landscape');
        
        // Header Setup
        doc.setFontSize(20);
        doc.setTextColor(30);
        doc.text("LAMS POWER", 148, 20, null, null, "center");
        doc.setFontSize(14);
        doc.text("Salary Sheet: March-2026", 148, 28, null, null, "center");
        
        const tableBody = payrollData.map((p, index) => [
            index + 1,
            p.name,
            p.totalDaysInMonth,
            p.present,
            p.fridays + p.officeHolidays,
            p.approvedLeaves,
            p.absent,
            `Tk ${p.net.toLocaleString()}`
        ]);

        doc.autoTable({
            startY: 40,
            head: [['SL', 'Employee Name', 'Month Days', 'Present', 'Holidays', 'Leaves', 'Absent', 'Net Salary']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], halign: 'center' },
            styles: { fontSize: 10, halign: 'center' },
            columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
        });

        // Signature Section
        const finalY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(10);
        doc.line(30, finalY, 80, finalY);
        doc.text("Accounts", 55, finalY + 5, null, null, "center");

        doc.line(210, finalY, 260, finalY);
        doc.text("COO, LAMS POWER", 235, finalY + 5, null, null, "center");

        doc.save("LAMS_POWER_March_2026_Salary_Sheet.pdf");
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-200 uppercase tracking-widest">Generating Sheet...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Payroll Analytics</h1>
                {isAdmin && (
                    <button onClick={downloadSalarySheet} className="w-full md:w-auto bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                        <i className="fa-solid fa-file-export mr-2"></i> Download Full Sheet
                    </button>
                )}
            </div>

            {/* Mobile-First Card View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {payrollData.map(p => (
                    <div key={p.emp_id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight group-hover:text-blue-600 transition-colors">{p.name}</h3>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{p.emp_id}</p>
                            </div>
                            <span className="bg-slate-50 text-slate-400 p-3 rounded-2xl"><i className="fa-solid fa-sack-dollar"></i></span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 p-4 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Present</p>
                                <p className="text-sm font-black text-slate-900">{p.present} Days</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Absent</p>
                                <p className="text-sm font-black text-red-500">{p.absent} Days</p>
                            </div>
                        </div>

                        <div className="border-t border-dashed border-slate-100 pt-6 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Payable</p>
                                <p className="text-2xl font-black text-slate-950">৳{p.net.toLocaleString()}</p>
                            </div>
                            <button onClick={() => downloadSalarySheet()} className="w-12 h-12 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all shadow-sm">
                                <i className="fa-solid fa-arrow-down-to-bracket text-xs"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
