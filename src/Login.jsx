import { useState } from 'react';
import { supabase } from './supabase';

// ইউজারের ডাটাবেজ ইনফো সাজানোর ফাংশন (যাতে কোনো ডাটা মিসিং না থাকে)
const normalizeUser = (u) => ({
    id: String(u.emp_id || ""), 
    emp_id: String(u.emp_id || ""), 
    name: u.name || "User", 
    role: u.role || "Staff",
    salary: parseFloat(u.basic_salary || 0), 
    basic_salary: parseFloat(u.basic_salary || 0),
    phone: u.phone || "Not Set", 
    email: u.email || "Not Set", 
    address: u.address || "Not Set",
    nid: u.nid || "Not Set", 
    bank: u.bank || "Not Set", 
    father_name: u.father_name || "Not Set", 
    mother_name: u.mother_name || "Not Set", 
    emergency: u.emergency || "Not Set", 
    photo: u.photo || ""
});

export default function Login({ onLogin }) {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // .trim() ব্যবহার করায় এখন ভুলে স্পেস দিলেও কোনো সমস্যা নেই
        const cleanId = id.trim(); 

        try {
            const { data, error: dbError } = await supabase
                .from('employees')
                .select('*')
                .eq('emp_id', cleanId)
                .single();

            if (dbError || !data) {
                setError("User not found in Database!");
            } else if (String(data.password) !== password.trim()) {
                setError("Wrong Password!");
            } else {
                const cleanUser = normalizeUser(data); // ডাটা ফিক্স করা হলো
                localStorage.setItem('lams_user', JSON.stringify(cleanUser));
                onLogin(cleanUser);
            }
        } catch (err) {
            setError("Network Connection Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-2xl text-white text-3xl shadow-lg shadow-orange-500/30 mb-4">
                    <i className="fa-solid fa-bolt"></i>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">LAMS POWER</h1>
                <p className="text-slate-400 text-sm font-medium mt-1 mb-8">Pro Workspace</p>

                <form onSubmit={handleLogin} className="space-y-5">
                    <input 
                        type="text" 
                        value={id} 
                        onChange={(e) => setId(e.target.value)} 
                        className="w-full p-4 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] font-bold text-sm outline-none focus:bg-white focus:border-orange-500 transition-all" 
                        placeholder="Employee ID" 
                        required 
                    />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full p-4 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] font-bold text-sm outline-none focus:bg-white focus:border-orange-500 transition-all" 
                        placeholder="Password" 
                        required 
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-sm tracking-wide shadow-xl transition-all active:scale-95 disabled:bg-slate-400"
                    >
                        {loading ? 'AUTHENTICATING...' : 'LOGIN TO DASHBOARD'}
                    </button>
                </form>
                {error && <p className="mt-4 text-sm font-bold text-red-500">{error}</p>}
            </div>
        </div>
    );
}