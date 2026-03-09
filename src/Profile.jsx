import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const IMGBB_API = 'fa35771d26a22b015cf56d0376303c1c';

export default function Profile({ user, onProfileUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ফর্মের স্টেট
    const [form, setForm] = useState({
        phone: '', email: '', emergency: '', father_name: '', mother_name: '',
        nid: '', address: '', password: '', photo: ''
    });
    const [bankName, setBankName] = useState('');
    const [bankBranch, setBankBranch] = useState('');
    const [bankAcc, setBankAcc] = useState('');

    // পেজ লোড হলে ইউজারের আগের ডাটাগুলো ফর্মে বসিয়ে দেওয়া
    useEffect(() => {
        if (user) {
            setForm({
                phone: user.phone || '', email: user.email || '', emergency: user.emergency || '',
                father_name: user.father_name || '', mother_name: user.mother_name || '',
                nid: user.nid || '', address: user.address || '', password: '', photo: user.photo || ''
            });

            if (user.bank) {
                const parts = user.bank.split(' - ');
                if (parts.length === 3) {
                    setBankName(parts[0]); setBankBranch(parts[1]); setBankAcc(parts[2]);
                } else {
                    setBankAcc(user.bank);
                }
            }
        }
    }, [user]);

    // ছবি আপলোড ফাংশন
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('image', file);
        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API}`, { method: 'POST', body: uploadData });
            const json = await res.json();
            if (json.success) {
                setForm({ ...form, photo: json.data.url });
                alert("Photo uploaded! Click 'Save Changes' to update profile.");
            }
        } catch (err) { alert("Upload failed!"); } finally { setUploading(false); }
    };

    // প্রোফাইল সেভ ফাংশন
    const handleSaveProfile = async () => {
        setSaving(true);
        const fullBank = (bankName || bankBranch || bankAcc) ? `${bankName} - ${bankBranch} - ${bankAcc}` : '';
        
        const updateData = { 
            phone: form.phone, email: form.email, emergency: form.emergency, 
            father_name: form.father_name, mother_name: form.mother_name, 
            nid: form.nid, address: form.address, bank: fullBank, photo: form.photo 
        };
        if (form.password) updateData.password = form.password; // শুধু টাইপ করলেই পাসওয়ার্ড চেঞ্জ হবে

        try {
            const { data, error } = await supabase.from('employees').update(updateData).eq('emp_id', user.emp_id).select().single();
            if (error) throw error;
            
            // App.jsx কে নতুন ডাটা জানিয়ে দেওয়া
            localStorage.setItem('lams_user', JSON.stringify(data));
            onProfileUpdate(data);
            setIsEditing(false);
            alert("Profile Updated Successfully! 🎉");
        } catch (error) { alert("Error saving profile!"); } finally { setSaving(false); }
    };

    const detailRow = (label, value) => (
        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="text-sm font-bold text-slate-700 break-all">{value || 'Not Set'}</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto animate-[fadeIn_0.4s_ease-out]">
            {/* Profile Header */}
            <div className="bg-white/90 backdrop-blur-xl p-10 lg:p-14 rounded-[3rem] shadow-xl border border-white mb-8">
                <div className="flex flex-col md:flex-row items-center gap-8 border-b border-slate-100 pb-8 mb-8">
                    <img src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=ea580c&color=fff`} className="w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl object-cover bg-slate-50" />
                    <div className="text-center md:text-left">
                        <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">{user?.name}</h3>
                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">{user?.role}</span>
                        <span className="px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-bold uppercase tracking-widest ml-2">ID: {user?.emp_id}</span>
                    </div>
                    <button onClick={() => setIsEditing(true)} className="md:ml-auto bg-slate-50 border border-slate-200 hover:border-orange-500 hover:text-orange-600 hover:bg-white text-slate-600 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95">
                        <i className="fa-solid fa-pen mr-2"></i> Edit Profile
                    </button>
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detailRow('Phone', user?.phone)}
                    {detailRow('Emergency', user?.emergency)}
                    {detailRow('Email', user?.email)}
                    {detailRow('Father\'s Name', user?.father_name)}
                    {detailRow('Mother\'s Name', user?.mother_name)}
                    {detailRow('NID', user?.nid)}
                    {detailRow('Bank Info', user?.bank)}
                    {detailRow('Address', user?.address)}
                    {detailRow('Base Salary', `${user?.basic_salary?.toLocaleString() || 0} BDT`)}
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-red-500 transition-all"><i className="fa-solid fa-xmark"></i></button>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Update Profile</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Photo Upload */}
                            <div className="md:col-span-2 flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <img src={form.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=ea580c&color=fff`} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Profile Photo</label>
                                    <input type="file" onChange={handlePhotoUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white file:text-orange-600 hover:file:bg-orange-100 cursor-pointer" />
                                    {uploading && <span className="text-xs font-bold text-orange-500 ml-2 animate-pulse">Uploading...</span>}
                                </div>
                            </div>
                            
                            {/* Inputs */}
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label><input type="password" placeholder="Leave empty to keep current" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Phone</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Email</label><input type="text" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Emergency Contact</label><input type="text" value={form.emergency} onChange={e => setForm({...form, emergency: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Father's Name</label><input type="text" value={form.father_name} onChange={e => setForm({...form, father_name: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Mother's Name</label><input type="text" value={form.mother_name} onChange={e => setForm({...form, mother_name: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">NID Number</label><input type="text" value={form.nid} onChange={e => setForm({...form, nid: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Address</label><input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 focus:bg-white transition-all" /></div>
                            
                            {/* Bank Info Array */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                                <div className="md:col-span-3 text-xs font-black text-slate-400 uppercase mb-1">Bank Information</div>
                                <div><input type="text" placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full p-3 rounded-xl bg-white font-bold text-sm outline-none border border-slate-200 focus:border-orange-500" /></div>
                                <div><input type="text" placeholder="Branch Name" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full p-3 rounded-xl bg-white font-bold text-sm outline-none border border-slate-200 focus:border-orange-500" /></div>
                                <div><input type="text" placeholder="Account No" value={bankAcc} onChange={e => setBankAcc(e.target.value)} className="w-full p-3 rounded-xl bg-white font-bold text-sm outline-none border border-slate-200 focus:border-orange-500" /></div>
                            </div>
                        </div>
                        
                        <button onClick={handleSaveProfile} disabled={saving || uploading} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-6 disabled:bg-slate-400">
                            {saving ? 'SAVING...' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}