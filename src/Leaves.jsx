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
        if(!leaveDate || !leaveReason) return alert("Please fill all fields!");
        
        try {
            await supabase.from('leaves').insert([{ 
                emp_id: user.emp_id, 
                name: user.name, 
                type: leaveType, 
                date: leaveDate, 
                reason: leaveReason, 
                status: 'Pending' 
            }]);
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
        <div className="max-w-6xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease-out] pb-10 px-2">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="text-xl font-extrabold text-slate-900">{isAdmin ? 'Requests' : 'My Leaves'}</h3>
                {!isAdmin && (
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase shadow-lg active:scale-95 transition-all"
                    >
                        Apply
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {(isAdmin ? leaves.filter(l => l.status === 'Pending') : leaves.filter(l => String(l.emp_id) === String(user.emp_id))).map(l => (
                    <div key={l.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-800">{isAdmin ? l.name : l.type}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{l.date}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${l.status === 'Approved' ? 'bg-green-100 text-green-600' : (l.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-500')}`}>{l.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl italic">"{l.reason}"</p>
                        {isAdmin && (
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => handleUpdateStatus(l.id, 'Approved')} className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold text-xs uppercase">Approve</button>
                                <button onClick={() => handleUpdateStatus(l.id, 'Rejected')} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-xs uppercase">Reject</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 relative animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
                        <h3 className="text-2xl font-black text-slate-900 text-center mb-6">Request Leave</h3>
                        <form onSubmit={handleSubmitLeave} className="space-y-4">
                            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none">
                                <option>Casual Leave</option><option>Sick Leave</option><option>Emergency</option>
                            </select>
                            <input type="date" required value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                            <textarea required placeholder="Reason..." rows="3" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-medium text-sm outline-none"></textarea>
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xl active:scale-95 transition-all">Submit Request</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
