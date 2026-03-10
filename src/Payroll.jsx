import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Payroll({ user }) {
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const fetchAndCalculate = async () => {
            setLoading(true);
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            const [empRes, attRes, leafRes, holidayRes] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('attendance').select('*').gte('date', start).lte('date', end),
                supabase.from('leaves').select('*').eq('status', 'Approved').gte('date', start).lte('date', end),
                supabase.from('holidays').select('*').gte('date', start).lte('date', end)
            ]);

            // শুক্রবার ক্যালকুলেট
            let fridays = 0;
            let d = new Date(start);
            while (d <= new Date(end)) {
                if (d.getDay() === 5) fridays++;
                d.setDate(d.getDate() + 1);
            }

            const calculated = (empRes.data || []).map(emp => {
                const present = attRes.data?.filter(a => a.emp_id === emp.emp_id).length || 0;
                const leaves = leafRes.data?.filter(l => l.emp_id === emp.emp_id).length || 0;
                const officeOff = holidayRes.data?.length || 0;
                
                const totalPaidDays = present + fridays + leaves + officeOff;
                const basic = parseFloat(emp.basic_salary || 0);
                const net = Math.round((basic / 30) * totalPaidDays);

                return { ...emp, present, fridays, leaves, officeOff, totalPaidDays, net };
            });

            setPayrollData(isAdmin ? calculated : calculated.filter(p => p.emp_id === user.emp_id));
            setLoading(false);
        };
        fetchAndCalculate();
    }, [user]);

    const downloadFullSheet = () => {
        const doc = new jsPDF();
        doc.text("LAMS POWER - Monthly Payroll Sheet", 14, 15);
        const rows = payrollData.map(p => [p.name, p.present, `${p.fridays + p.officeOff}`, p.leaves, `Tk ${p.net}`]);
        doc.autoTable({
            head: [['Staff', 'Duty', 'Holidays/Fri', 'Leaves', 'Net Salary']],
            body: rows,
            startY: 25,
            theme: 'grid'
        });
        doc.save(`Lams_Payroll_${new Date().getMonth() + 1}.pdf`);
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-200 animate-pulse">Calculating Payroll...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Payroll Analytics</h1>
                {isAdmin && <button onClick={downloadFullSheet} className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Download All PDF</button>}
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="p-8">Employee</th><th className="p-8">Duty</th><th className="p-8">Paid Off</th><th className="p-8">Net Payable</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {payrollData.map(p => (
                            <tr key={p.emp_id} className="hover:bg-slate-50/50 transition-all">
                                <td className="p-8 font-bold text-slate-700">{p.name}</td>
                                <td className="p-8 text-green-600 font-black">{p.present} Days</td>
                                <td className="p-8 text-slate-400 font-bold">{p.fridays + p.officeOff + p.leaves} Days</td>
                                <td className="p-8 font-black text-slate-900">৳{p.net.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
