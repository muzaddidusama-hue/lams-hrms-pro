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

    useEffect(() => { 
        calculatePayroll(); 
    }, [user]);

    const calculatePayroll = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

            // ১. সব এমপ্লয়ী আনা
            const { data: employees } = await supabase.from('employees').select('*');
            
            // ২. এই মাসের এটেনডেন্স আনা
            const { data: attendance } = await supabase.from('attendance')
                .select('*')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            // ৩. এই মাসের গ্রান্টেড ছুটি আনা
            const { data: leaves } = await supabase.from('leaves')
                .select('*')
                .eq('status', 'Approved')
                .gte('start_date', startOfMonth);

            // ৪. শুক্রবার (Fridays) ক্যালকুলেট করা
            let fridays = 0;
            for (let d = new Date(startOfMonth); d <= new Date(endOfMonth); d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 5) fridays++;
            }

            const calculatedList = employees.map(emp => {
                const presentDays = attendance.filter(a => a.emp_id === emp.emp_id).length;
                const approvedLeaves = leaves.filter(l => l.emp_id === emp.emp_id).length;
                
                // মোট বেতনযোগ্য দিন = উপস্থিত + শুক্রবার + গ্রান্টেড ছুটি
                const totalPaidDays = presentDays + fridays + approvedLeaves;
                
                // স্যালারি ক্যালকুলেশন (বেসিক স্যালারি ধরে)
                const basic = parseFloat(emp.salary || 0);
                const dailyRate = basic / 30;
                const netSalary = Math.round(dailyRate * totalPaidDays);

                return {
                    emp_id: emp.emp_id,
                    name: emp.name,
                    month: monthName,
                    basic_salary: basic,
                    present: presentDays,
                    leaves: approvedLeaves,
                    fridays: fridays,
                    net_salary: netSalary
                };
            });

            // যদি এডমিন না হয়, শুধু নিজের ডাটা দেখবে
            const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';
            setPayrollData(isAdmin ? calculatedList : calculatedList.filter(p => p.emp_id === user.emp_id));

        } catch (err) {
            console.error("Calculation Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Payslip_${selectedSlip.name}.pdf`);
        setIsDownloading(false);
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase">Calculating Monthly Payroll...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Lams Power Payroll</h1>
            <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-6">Employee</th>
                            <th className="p-6 text-center">Present</th>
                            <th className="p-6 text-center">Leave/Fri</th>
                            <th className="p-6">Net Salary</th>
                            <th className="p-6 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {payrollData.map(p => (
                            <tr key={p.emp_id} className="hover:bg-slate-50/50 transition-all">
                                <td className="p-6 font-bold text-slate-700">{p.name}</td>
                                <td className="p-6 text-center font-black text-green-600">{p.present} Days</td>
                                <td className="p-6 text-center text-slate-500 font-medium">{p.leaves} L / {p.fridays} F</td>
                                <td className="p-6 font-black text-slate-900">৳{p.net_salary}</td>
                                <td className="p-6 text-center">
                                    <button onClick={() => setSelectedSlip(p)} className="text-slate-900 font-black text-[10px] uppercase underline underline-offset-4 tracking-widest">Generate Slip</button>
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
                        <div ref={slipRef} className="p-10 bg-white border border-slate-100 rounded-[2rem]">
                            <h2 className="text-xl font-black text-slate-900 uppercase mb-8">Lams Power Payslip</h2>
                            <div className="space-y-4 text-sm">
                                <p className="flex justify-between border-b pb-2"><span>Month</span><span className="font-bold">{selectedSlip.month}</span></p>
                                <p className="flex justify-between border-b pb-2"><span>Attendance</span><span className="font-bold">{selectedSlip.present} Days</span></p>
                                <p className="flex justify-between border-b pb-2"><span>Fridays + Leaves</span><span className="font-bold">{selectedSlip.fridays + selectedSlip.leaves} Days</span></p>
                                <p className="flex justify-between pt-6 text-2xl font-black"><span>Total</span><span>৳{selectedSlip.net_salary}</span></p>
                            </div>
                        </div>
                        <button onClick={handleDownload} disabled={isDownloading} className="w-full mt-8 h-16 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em]">{isDownloading ? 'Downloading...' : 'Download PDF'}</button>
                    </div>
                </div>
            )}
            <style>{`@keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
    );
}
