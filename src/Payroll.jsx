import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Payroll({ user }) {
    const [payslips, setPayslips] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const slipRef = useRef();

    useEffect(() => {
        fetchPayslips();
    }, []);

    const fetchPayslips = async () => {
        let query = supabase.from('payroll').select('*');
        if (user.role !== 'Admin') query = query.eq('emp_id', user.emp_id);
        const { data } = await query;
        setPayslips(data || []);
    };

    const downloadPDF = async () => {
        const element = slipRef.current;
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Payslip_${selectedSlip.month}_${selectedSlip.name}.pdf`);
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
                                <td className="p-6"><button onClick={() => setSelectedSlip(slip)} className="text-slate-900 font-black text-[10px] uppercase underline underline-offset-4 tracking-widest hover:text-blue-600 transition-all">View Payslip</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSlip && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative shadow-2xl my-10">
                        <button onClick={() => setSelectedSlip(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
                        
                        {/* PDF Content Start */}
                        <div ref={slipRef} className="p-10 border border-slate-100 rounded-[2rem] bg-white">
                            <div className="flex justify-between items-start mb-12">
                                <div><h2 className="text-2xl font-black text-slate-900 uppercase">Lams Power</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Official Pay Document</p></div>
                                <div className="text-right"><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Month</p><p className="text-xl font-black text-slate-900">{selectedSlip.month}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-10 mb-12">
                                <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Employee Name</p><p className="font-bold text-slate-900">{selectedSlip.name}</p></div>
                                <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Employee ID</p><p className="font-bold text-slate-900">{selectedSlip.emp_id}</p></div>
                            </div>
                            <div className="space-y-4 border-t border-slate-100 pt-8">
                                <div className="flex justify-between font-bold text-slate-600"><span>Basic Salary</span><span>৳{selectedSlip.basic_salary}</span></div>
                                <div className="flex justify-between font-bold text-slate-600"><span>Allowances</span><span>৳{selectedSlip.allowances}</span></div>
                                <div className="flex justify-between font-bold text-red-500"><span>Deductions</span><span>-৳{selectedSlip.deductions}</span></div>
                                <div className="flex justify-between text-2xl font-black text-slate-900 pt-4 border-t border-slate-900"><span>Net Payable</span><span>৳{selectedSlip.net_salary}</span></div>
                            </div>
                        </div>
                        {/* PDF Content End */}

                        <button onClick={downloadPDF} className="w-full mt-8 h-16 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Download PDF Payslip</button>
                    </div>
                </div>
            )}
        </div>
    );
}
