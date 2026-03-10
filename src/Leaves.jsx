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

    useEffect(() => { fetchLeaves(); }, []);

    const fetchLeaves = async () => {
        setLoading(true);
        const { data } = await supabase.from('leaves').select('*').order('id', { ascending: false });
        if (data) setLeaves(data);
        setLoading(false);
    };

    const handleSubmitLeave = async (e) => {
        e.preventDefault();
        try {
            await supabase.from('leaves').insert([{ emp_id: user.emp_id, name: user.name, type: leaveType, date: leaveDate, reason: leaveReason, status: 'Pending' }]);
            setShowModal(false); setLeaveDate(''); setLeaveReason(''); fetchLeaves();
            alert("Leave Request Sent! 📨");
        } catch (error) { alert("Error sending request!"); }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await supabase.from('leaves').update({ status }).eq('id', id);
            fetchLeaves();
        } catch (error) { alert("Error updating status"); }
    };

    return (
        <div className="max-w-6xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            <div className="flex justify-between items-center bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">{isAdmin ? 'Pending Requests' : 'My Leaves'}</h3>
                {!isAdmin && <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-lg transition-all">Apply Leave</button>}
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-4 md:p-6 whitespace-nowrap">Employee / Type</th>
                                <th className="p-4 md:p-6 whitespace-nowrap">Date</th>
                                <th className="p-4 md:p-6 whitespace-nowrap">Reason</th>
                                <th className="p-4 md:p-6 text-right whitespace-nowrap">Action / Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(isAdmin ? leaves.filter(l => l.status === 'Pending') : leaves.filter(l => String(l.emp_id) === String(user.emp_id))).map(l => (
                                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 md:p-6">
                                        <div className="font-bold text-slate-700 text-sm whitespace-nowrap">{isAdmin ? l.name : l.type}</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{isAdmin ? `ID: ${l.emp_id}` : l.status}</div>
                                    </td>
                                    <td className="p-4 md:p-6 text-sm whitespace-nowrap font-medium">{l.date}</td>
                                    <td className="p-4 md:p-6 text-sm text-slate-500 max-w-[200px] truncate">{l.reason}</td>
                                    <td className="p-4 md:p-6 text-right whitespace-nowrap">
                                        {isAdmin ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleUpdateStatus(l.id, 'Approved')} className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-500 hover:text-white transition-all"><i className="fa-solid fa-check"></i></button>
                                                <button onClick={() => handleUpdateStatus(l.id, 'Rejected')} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-xmark"></i></button>
                                            </div>
                                        ) : (
                                            <span className={`font-black uppercase text-[10px] ${l.status === 'Approved' ? 'text-green-600' : (l.status === 'Rejected' ? 'text-red-600' : 'text-orange-500')}`}>{l.status}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 relative animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                        <h3 className="text-2xl font-black text-slate-900 text-center mb-6">Request Leave</h3>
                        <form onSubmit={handleSubmitLeave} className="space-y-4">
                            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none">
                                <option>Casual Leave</option><option>Sick Leave</option><option>Emergency</option>
                            </select>
                            <input type="date" required value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                            <textarea required placeholder="Reason..." rows="3" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-medium text-sm outline-none"></textarea>
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider">Submit Request</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
