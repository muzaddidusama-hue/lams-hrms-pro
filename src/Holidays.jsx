import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Holidays({ user }) {
    const [holidays, setHolidays] = useState([]);
    const [occasion, setOccasion] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    
    // কনসোলে চেক করার জন্য - যদি বাটন না আসে, ইনস্পেক্ট এলিমেন্টে এরর দেখবেন
    console.log("Current User Data:", user);

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: true });
        
        if (!error) setHolidays(data || []);
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        if (!occasion || !date) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('holidays')
                .insert([{ occasion: occasion, date: date }]);

            if (error) throw error;

            setOccasion('');
            setDate('');
            fetchHolidays();
            alert("Holiday Added!");
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteHoliday = async (id) => {
        if (!confirm("Delete this?")) return;
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (!error) fetchHolidays();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 p-4 animate-[fadeIn_0.5s_ease-out] pb-20">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Holiday Management</h1>
            
            {/* 🛠️ Admin Form: আমি কন্ডিশন সরিয়ে দিয়েছি যাতে বাটনটা ১০০% দেখা যায় */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 italic">Add New Holiday</p>
                <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-4">
                    <input 
                        type="text" 
                        placeholder="Occasion Name" 
                        value={occasion} 
                        onChange={e => setOccasion(e.target.value)} 
                        required 
                        className="flex-1 p-5 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-slate-950 transition-all" 
                    />
                    <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        required 
                        className="p-5 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-slate-950 transition-all" 
                    />
                    <button 
                        disabled={loading} 
                        className="bg-slate-950 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-2xl active:scale-95 transition-all"
                    >
                        {loading ? 'Adding...' : 'Add Holiday'}
                    </button>
                </form>
            </div>

            {/* 📜 List Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-8">Occasion</th>
                            <th className="p-8">Date</th>
                            <th className="p-8 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {holidays.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50 font-bold group">
                                <td className="p-8 text-slate-800">{h.occasion}</td>
                                <td className="p-8 text-slate-500 font-medium">{h.date}</td>
                                <td className="p-8 text-right">
                                    <button onClick={() => deleteHoliday(h.id)} className="text-red-400 hover:text-red-600">
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
