import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Payroll({ user }) {
    const [payslips, setPayslips] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const slipRef = useRef();

    useEffect(() => { fetchPayslips(); }, []);

    const fetchPayslips = async () => {
        let query = supabase.from('payroll').select('*');
        if (user.role !== 'Admin') query = query.eq('emp_id', user.emp_id);
        const { data } = await query;
        setPayslips(data || []);
    };

    // 🚀 PDF Download Function (ব্রাউজার প্রিন্ট নয়, সরাসরি ডাউনলোড)
    const handleDownload = async () => {
        setIsDownloading(true);
        const element = slipRef.current;
        const canvas = await html2canvas(element, { scale: 3, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Payslip_${selectedSlip.name}_${selectedSlip.month}.pdf`);
        setIsDownloading(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Payroll Center</h1>
            
            <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="p-6">Employee</th><th className="p-6">Month</th><th className="p-6">Net Salary</th><th className="p-6">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {payslips.map(slip => (
                            <tr key={slip.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="p-6 font-bold text-slate-700">{slip.name}</td>
                                <td className="p-6 text-slate-500 font-medium">{slip.month}</td>
                                <td className="p-6 font-black text-slate-900">৳{slip.net_salary}</td>
                                <td className="p-6"><button onClick={() => setSelectedSlip(slip)} className="text-slate-900 font-black text-[10px] uppercase underline underline-offset-4 tracking-widest">View Payslip</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSlip && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative shadow-2xl my-10 animate-[zoomIn_0.3s_ease-out]">
                        <button onClick={() => setSelectedSlip(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
                        
                        {/* এই অংশটি পিডিএফ হবে */}
                        <div ref={slipRef} className="p-8 bg-white border border-slate-50 rounded-[2rem]">
                            <div className="flex justify-between items-start mb-8">
                                <div><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Lams Power</h2><p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Digital Payslip</p></div>
                                <div className="text-right"><p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Month</p><p className="font-black text-slate-900">{selectedSlip.month}</p></div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] text-slate-400 uppercase font-black">Employee</span><span className="font-bold text-slate-900">{selectedSlip.name}</span></div>
                                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] text-slate-400 uppercase font-black">Basic</span><span className="font-bold text-slate-900">৳{selectedSlip.basic_salary}</span></div>
                                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] text-slate-400 uppercase font-black">Deductions</span><span className="font-bold text-red-500">-৳{selectedSlip.deductions}</span></div>
                                <div className="flex justify-between pt-4"><span className="text-sm text-slate-900 font-black uppercase">Net Payable</span><span className="text-xl font-black text-slate-900">৳{selectedSlip.net_salary}</span></div>
                            </div>
                        </div>

                        <button 
                            onClick={handleDownload} 
                            disabled={isDownloading}
                            className={`w-full mt-8 h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl transition-all ${isDownloading ? 'bg-slate-400' : 'bg-slate-900 text-white hover:scale-[1.02]'}`}
                        >
                            {isDownloading ? 'Downloading...' : 'Download PDF Payslip'}
                        </button>
                    </div>
                </div>
            )}
            <style>{`@keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
    );
}
