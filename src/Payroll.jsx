import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Payroll({ user }) {
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const calculate = async () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            const [emp, att, leaf, hol] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('attendance').select('*').gte('date', start).lte('date', end),
                supabase.from('leaves').select('*').eq('status', 'Approved').gte('date', start).lte('date', end),
                supabase.from('holidays').select('*').gte('date', start).lte('date', end)
            ]);
            let fridays = 0; let d = new Date(start); while (d <= new Date(end)) { if (d.getDay() === 5) fridays++; d.setDate(d.getDate() + 1); }
            const res = (emp.data || []).map(e => {
                const present = att.data?.filter(a => a.emp_id === e.emp_id).length || 0;
                const leaves = leaf.data?.filter(l => l.emp_id === e.emp_id).length || 0;
                const officeHolidays = hol.data?.length || 0;
                const totalPaid = present + fridays + leaves + officeHolidays;
                const basic = parseFloat(e.basic_salary || 0);
                const net = Math.round((basic / 30) * totalPaid);
                return { ...e, present, fridays, leaves, officeHolidays, net };
            });
            setPayrollData(isAdmin ? res : res.filter(p => p.emp_id === user.emp_id));
            setLoading(false);
        };
        calculate();
    }, [user, isAdmin]);

    const downloadProfessionalPDF = (p) => {
        const doc = new jsPDF();
        // Header
        doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text("LAMS POWER", 105, 20, null, null, "center");
        doc.setFontSize(10); doc.setTextColor(100); doc.text("Employee Payslip - March 2026", 105, 28, null, null, "center");
        doc.line(20, 35, 190, 35);

        // Employee Info
        doc.setFontSize(12); doc.setTextColor(0); doc.text(`Employee: ${p.name}`, 20, 45);
        doc.text(`Staff ID: ${p.emp_id}`, 20, 52);

        // Table
        doc.autoTable({
            startY: 60,
            head: [['Description', 'Days/Amount', 'Subtotal']],
            body: [
                ['Present Days', p.present, '-'],
                ['Fridays & Holidays', p.fridays + p.officeHolidays, '-'],
                ['Approved Leaves', p.leaves, '-'],
                ['Basic Salary', '-', `Tk ${p.basic_salary}`],
                ['Net Payable', '-', `Tk ${p.net}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.text("Authorized Signature", 150, 150);
        doc.save(`Payslip_${p.name}.pdf`);
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-200">Processing Payroll...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
            <div className="flex justify-between items-center px-4 md:px-0">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Payroll Hub</h1>
                {isAdmin && <button className="hidden md:block bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase">Full Report</button>}
            </div>

            {/* Mobile Responsive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
                {payrollData.map(p => (
                    <div key={p.emp_id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{p.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.designation || 'Staff'}</p>
                            </div>
                            <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">ACTIVE</div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex justify-between text-sm font-bold"><span className="text-slate-400">Duty Days</span><span className="text-slate-900">{p.present}</span></div>
                            <div className="flex justify-between text-sm font-bold"><span className="text-slate-400">Paid Off</span><span className="text-slate-900">{p.fridays + p.officeHolidays + p.leaves}</span></div>
                            <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Salary</span>
                                <span className="text-xl font-black text-slate-900">৳{p.net.toLocaleString()}</span>
                            </div>
                        </div>

                        <button onClick={() => downloadProfessionalPDF(p)} className="w-full bg-slate-50 hover:bg-slate-950 hover:text-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                            <i className="fa-solid fa-file-pdf mr-2"></i> Download Slip
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
