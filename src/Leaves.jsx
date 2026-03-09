import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Leaves({ user }) {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    
    const [leaveType, setLeaveType] = useState('Casual Leave');
    const [leaveDate, setLeaveDate] = useState('');
    const [leaveReason, setLeaveReason] = useState('');

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        setLoading(true);
        const { data } = await supabase.from('leaves').select('*').order('id', { ascending: false });
        if (data) setLeaves(data);
        setLoading(false);
    };

    // এমপ্লয়ীর ছুটির আবেদন
    const handleSubmitLeave = async (e) => {
        e.preventDefault();
        try {
            const newLeave = { 
                emp_id: user.emp_id, 
                name: user.name, 
                type: leaveType, 
                date: leaveDate, 
                reason: leaveReason, 
                status: 'Pending' 
            };
            await supabase.from('leaves').insert([newLeave]);
            setShowModal(false);
            setLeaveDate('');
            setLeaveReason('');
            fetchLeaves();
            alert("Leave Request Sent! 📨");
        } catch (error) {
            alert("Error sending request!");
        }
    };

    // এডমিনের অ্যাপ্রুভ বা রিজেক্ট করা
    const handleUpdateStatus = async (id, status) => {
        try {
            await supabase.from('leaves').update({ status }).eq('id', id);
            fetchLeaves();
        } catch (error) {
            alert("Error updating status");
        }
    };

    // সাধারণ এমপ্লয়ীদের ভিউ
    const renderEmployeeView = () => {
        const myLeaves = leaves.filter(l => String(l.emp_id) === String(user.emp_id));
        return (
            <div className="bg-white rounded-[2.5rem] overflow-hidden overflow-x-auto shadow-sm border border-slate-100">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="p-6">Type</th><th className="p-6">Date</th><th className="p-6">Reason</th><th className="p-6 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {myLeaves.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-6 font-bold text-slate-700">{l.type}</td>
                                <td className="p-6 text-sm">{l.date}</td>
                                <td className="p-6 text-sm text-slate-500">{l.reason}</td>
                                <td className={`p-6 text-right font-black uppercase text-xs ${l.status === 'Approved' ? 'text-green-600' : (l.status === 'Rejected' ? 'text-red-600' : 'text-orange-500')}`}>
                                    {l.status}
                                </td>
                            </tr>
                        ))}
                        {myLeaves.length === 0 && <tr><td colSpan="4" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No leave history found</td></tr>}
                    </tbody>
                </table>
            </div>
        );
    };

    // এডমিনের ভিউ
    const renderAdminView = () => {
        const pendingLeaves = leaves.filter(l => l.status === 'Pending');
        return (
            <div className="bg-white rounded-[2.5rem] overflow-hidden overflow-x-auto shadow-sm border border-slate-100">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="p-6">Employee</th><th className="p-6">Details</th><th className="p-6">Reason</th><th className="p-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {pendingLeaves.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-6">
                                    <div className="font-bold text-slate-700">{l.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">ID: {l.emp_id}</div>
                                </td>
                                <td className="p-6 text-sm"><span className="font-bold text-slate-600">{l.type}</span><br/><span className="text-xs text-slate-400">{l.date}</span></td>
                                <td className="p-6 text-sm italic text-slate-500">"{l.reason}"</td>
                                <td className="p-6 text-right">
                                    <button onClick={() => handleUpdateStatus(l.id, 'Approved')} className="bg-green-50 text-green-600 px-4 py-2 rounded-xl mr-2 hover:bg-green-500 hover:text-white transition-all font-bold text-xs"><i className="fa-solid fa-check"></i></button>
                                    <button onClick={() => handleUpdateStatus(l.id, 'Rejected')} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-xs"><i className="fa-solid fa-xmark"></i></button>
                                </td>
                            </tr>
                        ))}
                        {pendingLeaves.length === 0 && <tr><td colSpan="4" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No pending requests</td></tr>}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{isAdmin ? 'Pending Requests' : 'My Leaves'}</h3>
                {!isAdmin && (
                    <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all">
                        Apply Leave
                    </button>
                )}
            </div>

            {loading ? <div className="p-20 text-center"><div className="border-4 border-slate-200 border-t-orange-500 rounded-full w-10 h-10 animate-spin mx-auto"></div></div> : (isAdmin ? renderAdminView() : renderEmployeeView())}

            {/* Leave Apply Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-red-500 transition-all"><i className="fa-solid fa-xmark"></i></button>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-6">Request Leave</h3>
                        
                        <form onSubmit={handleSubmitLeave} className="space-y-4">
                            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer appearance-none">
                                <option>Casual Leave</option>
                                <option>Sick Leave</option>
                                <option>Emergency</option>
                            </select>
                            <input type="date" required value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer" />
                            <textarea required placeholder="Reason for leave..." rows="3" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-medium text-sm outline-none focus:border-orange-500 focus:bg-white transition-all"></textarea>
                            
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-2">Submit Request</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}