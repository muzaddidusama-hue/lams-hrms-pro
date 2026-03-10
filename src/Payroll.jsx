import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Payroll({ user }) {
    const [payrollData, setPayrollData] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [loading, setLoading] = useState(true);
    const slipRef = useRef();

    useEffect(() => { calculateMonthlyPayroll(); }, [user]);

    const calculateMonthlyPayroll = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            const monthDisplay = now.toLocaleString('default', { month: 'long', year: 'numeric' });

            // ১. ডাটাবেজ থেকে ডাটা আনা (আপনার কলাম নেম অনুযায়ী)
            const [empRes, attRes, leafRes] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('attendance').select('*').gte('date', startOfMonth).lte('date', endOfMonth),
                supabase.from('leaves').select('*').eq('status', 'Approved').gte('date', startOfMonth).lte('date', endOfMonth)
            ]);

            const employees = empRes.data || [];
            const attendance = attRes.data || [];
            const leaves = leafRes.data || [];

            // ২. শুক্রবার ক্যালকুলেট করা
            let fridays = 0;
            const tempDate = new Date(startOfMonth);
            while (tempDate <= new Date(endOfMonth)) {
                if (tempDate.getDay() === 5) fridays++;
                tempDate.setDate(tempDate.getDate() + 1);
            }

            // ৩. মূল ক্যালকুলেশন
            const finalPayroll = employees.map(emp => {
                const myAttendance = attendance.filter(a => a.emp_id === emp.emp_id).length;
                const myApprovedLeaves = leaves.filter(l => l.emp_id === emp.emp_id).length;
                
                // আপনার ডাটাবেজে কলামের নাম 'basic_salary'
                const basic = parseFloat(emp.basic_salary || 0); 
                const totalPaidDays = myAttendance + fridays + myApprovedLeaves;
                
                // স্যালারি হিসাব (ধরি ৩০ দিন মাস)
                const netPay = Math.round((basic / 30) * totalPaidDays);

                return {
                    emp_id: emp.emp_id,
                    name: emp.name,
                    month: monthDisplay,
                    basic_salary: basic,
                    present: myAttendance,
                    fridays: fridays,
                    leaves: myApprovedLeaves,
                    total_paid_days: totalPaidDays,
                    net_salary: netPay
                };
            });

            // এডমিন প্রোটেকশন
            const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';
            setPayrollData(isAdmin ? finalPayroll : finalPayroll.filter(p => p.emp_id === user.emp_id));

        } catch (err) {
            console.error("Payroll Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        setIsDownloading(true);
        const canvas = await html2canvas(slipRef.current, { scale: 3, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Payslip_${selectedSlip.name}.pdf`);
        setIsDownloading(false);
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase tracking-[0.4em]">Syncing Payroll Records...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Payroll Center</h1>
            
            <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-8">Employee</th>
                            <th className="p-8 text-center">Duty Days</th>
                            <th className="p-8 text-center">Fri + Leave</th>
                            <th className="p-8">Net Payable</th>
                            <th className="p-8 text-center">Invoice</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {payrollData.map(p => (
                            <tr key={p.emp_id} className="hover:bg-slate-50/50 transition-all">
                                <td className="p-8 font-bold text-slate-800">{p.name}</td>
                                <td className="p-8 text-center font-black text-green-600">{p.present} Days</td>
                                <td className="p-8 text-center text-slate-500 font-medium">{p.fridays} F / {p.leaves} L</td>
                                <td className="p-8 font-black text-slate-900">৳{p.net_salary.toLocaleString()}</td>
                                <td className="p-8 text-center">
                                    <button onClick={() => setSelectedSlip(p)} className="text-slate-900 font-black text-[10px] uppercase underline underline-offset-4 tracking-widest hover:text-blue-600">View Slip</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSlip && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative shadow-2xl animate-[zoomIn_0.3s_ease-out]">
                        <button onClick={() => setSelectedSlip(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
                        
                        <div ref={slipRef} className="p-10 bg-white border border-slate-50 rounded-[2.5rem] text-slate-900">
                            <h2 className="text-2xl font-black uppercase mb-10 tracking-tighter">Lams Power</h2>
                            <div className="space-y-4">
                                <p className="flex justify-between border-b pb-2"><span className="text-[10px] font-black text-slate-400 uppercase">Employee</span><span className="font-bold">{selectedSlip.name}</span></p>
                                <p className="flex justify-between border-b pb-2"><span className="text-[10px] font-black text-slate-400 uppercase">Basic Salary</span><span className="font-bold">৳{selectedSlip.basic_salary}</span></p>
                                <p className="flex justify-between border-b pb-2"><span className="text-[10px] font-black text-slate-400 uppercase">Paid Days (Inc. Fri)</span><span className="font-bold">{selectedSlip.total_paid_days} Days</span></p>
                                <p className="flex justify-between pt-6 text-2xl font-black"><span>Total Payable</span><span>৳{selectedSlip.net_salary}</span></p>
                            </div>
                        </div>

                        <button onClick={downloadPDF} disabled={isDownloading} className="w-full mt-8 h-16 bg-slate-900 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                            {isDownloading ? 'Processing PDF...' : 'Download PDF Slip'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
