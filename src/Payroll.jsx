import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Payroll({ user }) {
    const [payslips, setPayslips] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const slipRef = useRef(null);

    useEffect(() => {
        const fetchPayslips = async () => {
            const { data } = await supabase.from('payroll').select('*');
            setPayslips(data || []);
        };
        fetchPayslips();
    }, []);

    const generatePDF = async () => {
        if (!slipRef.current) return;
        
        try {
            const canvas = await html2canvas(slipRef.current, { 
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const width = pdf.internal.pageSize.getWidth();
            const height = (canvas.height * width) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`Payslip_${selectedSlip.name}.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
            alert("Failed to download PDF. Please try again.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        <tr><th className="p-4">Employee</th><th className="p-4">Month</th><th className="p-4">Action</th></tr>
                    </thead>
                    <tbody>
                        {payslips.map(slip => (
                            <tr key={slip.id} className="border-b border-slate-50">
                                <td className="p-4 font-bold text-slate-800">{slip.name}</td>
                                <td className="p-4 text-slate-500">{slip.month}</td>
                                <td className="p-4"><button onClick={() => setSelectedSlip(slip)} className="text-[10px] font-black uppercase underline">View Slip</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSlip && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative">
                        <button onClick={() => setSelectedSlip(null)} className="absolute top-6 right-6 text-slate-400">✕</button>
                        
                        {/* PDF কন্টেন্ট এলাকা */}
                        <div ref={slipRef} className="p-8 border border-slate-100 rounded-2xl bg-white text-slate-900">
                            <h2 className="text-xl font-black uppercase mb-4">Lams Power Payslip</h2>
                            <div className="space-y-2 text-sm">
                                <p><strong>Name:</strong> {selectedSlip.name}</p>
                                <p><strong>Month:</strong> {selectedSlip.month}</p>
                                <p><strong>Salary:</strong> ৳{selectedSlip.net_salary}</p>
                            </div>
                        </div>

                        <button onClick={generatePDF} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Download PDF Now</button>
                    </div>
                </div>
            )}
        </div>
    );
}
