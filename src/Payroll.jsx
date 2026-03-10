import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Payroll({ user }) {
    const [payslips, setPayslips] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [loading, setLoading] = useState(true);
    const slipRef = useRef();

    useEffect(() => { 
        fetchPayslips(); 
    }, [user]);

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            // ১. ডাটাবেজ থেকে ডাটা আনা
            let query = supabase.from('payroll').select('*');
            
            // যদি এডমিন না হয়, শুধু নিজের ডাটা দেখবে
            const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';
            if (!isAdmin) {
                query = query.eq('emp_id', user.emp_id);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Supabase Error:", error.message);
            } else {
                console.log("Fetched Payroll Data:", data); // ব্রাউজার কনসোলে ডাটা চেক করুন
                setPayslips(data || []);
            }
        } catch (err) {
            console.error("Unexpected Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedSlip || isDownloading) return;
        setIsDownloading(true);
        try {
            const element = slipRef.current;
            const canvas = await html2canvas(element, { 
                scale: 3, 
                useCORS: true,
                backgroundColor: "#ffffff" 
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Payslip_${selectedSlip.name}_${selectedSlip.month}.pdf`);
        } catch (err) {
            console.error("PDF Download Error:", err);
            alert("Could not generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase tracking-[0.4em]">Loading Payroll...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-end">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Payroll Center</h1>
                <button onClick={fetchPayslips} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900"><i className="fa-solid fa-rotate"></i> Refresh</button>
            </div>
            
            <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="p-6">Employee</th>
                            <th className="p-6">Month</th>
                            <th className="p-6">Net Salary</th>
                            <th className="p-6 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {payslips.length > 0 ? (
                            payslips.map(slip => (
                                <tr key={slip.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="p-6">
                                        <p className="font-bold text-slate-800">{slip.name}</p>
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{slip.emp_id}</p>
                                    </td>
                                    <td className="p-6 text-slate-500 font-medium">{slip.month}</td>
                                    <td className="p-6 font-black text-slate-900">৳{slip.net_salary}</td>
                                    <td className="p-6 text-center">
                                        <button onClick={() => setSelectedSlip(slip)} className="text-slate-900 font-black text-[10px] uppercase underline underline-offset-4 tracking-widest hover:text-blue-600 transition-all">View Payslip</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest">No payroll records found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payslip Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative shadow-2xl my-10 animate-[zoomIn_0.3s_ease-out]">
                        <button onClick={() => setSelectedSlip(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
                        
                        <div ref={slipRef} className="p-10 bg-white border border-slate-100 rounded-[2.5rem]">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Lams Power</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em]">Official Payslip</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Period</p>
                                    <p className="font-black text-slate-900">{selectedSlip.month}</p>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-50 pt-8">
                                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Employee Name</span><span className="font-bold text-slate-800">{selectedSlip.name}</span></div>
                                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Basic Salary</span><span className="font-bold text-slate-800">৳{selectedSlip.basic_salary}</span></div>
                                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Allowances</span><span className="font-bold text-slate-800">৳{selectedSlip.allowances || 0}</span></div>
                                <div className="flex justify-between border-b border-slate-50 pb-4"><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Deductions</span><span className="font-bold text-red-500">-৳{selectedSlip.deductions || 0}</span></div>
                                <div className="flex justify-between pt-4"><span className="text-sm text-slate-900 font-black uppercase tracking-tighter">Net Payable</span><span className="text-2xl font-black text-slate-900">৳{selectedSlip.net_salary}</span></div>
                            </div>
                        </div>

                        <button 
                            onClick={handleDownload} 
                            disabled={isDownloading}
                            className={`w-full mt-8 h-16 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl transition-all ${isDownloading ? 'bg-slate-400' : 'bg-slate-900 text-white hover:scale-[1.02] active:scale-95'}`}
                        >
                            {isDownloading ? 'Processing PDF...' : 'Download PDF Payslip'}
                        </button>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}
