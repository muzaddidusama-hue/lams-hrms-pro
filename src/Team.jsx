import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Team() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [addForm, setAddForm] = useState({ name: '', emp_id: '', basic_salary: '', password: '', role: 'Staff' });
    const [salaryUpdate, setSalaryUpdate] = useState('');

    // পেজ লোড হলেই স্টাফদের ডাটা আনবে
    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('employees').select('*').order('name', { ascending: true });
        if (data) setStaff(data);
        setLoading(false);
    };

    // নতুন স্টাফ অ্যাড করার ফাংশন
    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('employees').insert([addForm]);
            if (error) throw error;
            setShowAddModal(false);
            setAddForm({ name: '', emp_id: '', basic_salary: '', password: '', role: 'Staff' });
            fetchStaff(); // লিস্ট আপডেট
            alert("Account Created Successfully! 🎉");
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    // স্যালারি আপডেট করার ফাংশন
    const handleUpdateSalary = async () => {
        try {
            const { error } = await supabase.from('employees').update({ basic_salary: salaryUpdate }).eq('emp_id', selectedUser.emp_id);
            if (error) throw error;
            setSelectedUser(null);
            fetchStaff(); // লিস্ট আপডেট
            alert("Salary Updated Successfully! 💰");
        } catch (error) {
            alert("Error updating salary");
        }
    };

    // ডিটেইলস দেখানোর ছোট্ট ডিজাইন ব্লক
    const detailRow = (label, value) => (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xs font-bold text-slate-700 break-all">{value || 'Not Set'}</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            {/* Header Section */}
            <div className="flex items-center justify-between px-2 mb-8">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team Directory</h3>
                <button onClick={() => setShowAddModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
                    <i className="fa-solid fa-plus mr-2"></i> New Member
                </button>
            </div>

            {/* Staff List */}
            {loading ? (
                <div className="p-20 text-center"><div className="border-4 border-slate-200 border-t-orange-500 rounded-full w-10 h-10 animate-spin mx-auto"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {staff.map((u) => (
                        <div key={u.emp_id} onClick={() => { setSelectedUser(u); setSalaryUpdate(u.basic_salary); }} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-orange-300 hover:shadow-lg cursor-pointer group transition-all duration-300 hover:-translate-y-1 flex items-center gap-5 shadow-sm">
                            <img src={u.photo || `https://ui-avatars.com/api/?name=${u.name}&background=ea580c&color=fff`} className="w-14 h-14 rounded-2xl object-cover shadow-md group-hover:shadow-orange-500/20 transition-all" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-800 tracking-tight mb-1 group-hover:text-orange-600 transition-colors">{u.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 inline-block px-2 py-1 rounded-md">{u.role}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                <i className="fa-solid fa-arrow-right text-xs"></i>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal 1: Add New Staff */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 relative shadow-2xl animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-red-500 transition-all"><i className="fa-solid fa-xmark"></i></button>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Onboard New Staff</h3>
                        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Full Name" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" />
                            <input type="text" placeholder="Employee ID" required value={addForm.emp_id} onChange={e => setAddForm({...addForm, emp_id: e.target.value})} className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" />
                            <input type="number" placeholder="Basic Salary" required value={addForm.basic_salary} onChange={e => setAddForm({...addForm, basic_salary: e.target.value})} className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" />
                            <input type="password" placeholder="Password" required value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" />
                            <div className="md:col-span-2">
                                <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all appearance-none cursor-pointer">
                                    <option value="Staff">Role: Staff</option>
                                    <option value="Manager">Role: Manager</option>
                                    <option value="Admin">Role: Admin</option>
                                </select>
                            </div>
                            <button type="submit" className="md:col-span-2 w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2">Create Account</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Staff Details & Salary Update */}
            {selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 relative shadow-2xl animate-[fadeIn_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-red-500 transition-all"><i className="fa-solid fa-xmark"></i></button>
                        
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 p-1 bg-white border border-slate-200 rounded-full mx-auto shadow-xl mb-4">
                                <img src={selectedUser.photo || `https://ui-avatars.com/api/?name=${selectedUser.name}&background=ea580c&color=fff`} className="w-full h-full rounded-full object-cover" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h3>
                            <span className="inline-block mt-2 px-4 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedUser.role}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {detailRow('ID', selectedUser.emp_id)}
                            {detailRow('Email', selectedUser.email)}
                            {detailRow('Phone', selectedUser.phone)}
                            {detailRow('Emergency', selectedUser.emergency)}
                            {detailRow('Father', selectedUser.father_name)}
                            {detailRow('Mother', selectedUser.mother_name)}
                            {detailRow('NID', selectedUser.nid)}
                            {detailRow('Bank Info', selectedUser.bank)}
                            <div className="col-span-2">{detailRow('Address', selectedUser.address)}</div>
                        </div>

                        <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Base Salary (Admin Override)</p>
                            <div className="flex gap-2">
                                <input type="number" value={salaryUpdate} onChange={(e) => setSalaryUpdate(e.target.value)} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-orange-500 outline-none transition-all" />
                                <button onClick={handleUpdateSalary} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95">Save</button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}