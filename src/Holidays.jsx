import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Holidays({ user }) {
    const [holidays, setHolidays] = useState([]);
    const [occasion, setOccasion] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- এক্সেস কন্ট্রোল (Admin অথবা Manager হতে হবে) ---
    const userRole = user?.role?.toLowerCase() || '';
    const hasPermission = userRole === 'admin' || userRole === 'manager' || user?.id?.toLowerCase() === 'admin';

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
        if (!hasPermission) return alert("You don't have permission to add holidays!");
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
            alert("Holiday Added Successfully!");
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteHoliday = async (id) => {
        if (!hasPermission) return alert("Unauthorized access!");
        if (!confirm("Delete this holiday?")) return;
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (!error) fetchHolidays();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 p-4 animate-[fadeIn_0.5s_ease-out] pb-20">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Holiday Management</h1>
            
            {/* 🛠️ Restricted Admin/Manager Panel */}
            {hasPermission ? (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 italic">Add New Holiday (Admin/Manager Only)</p>
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
                            className="bg-slate-950 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            {loading ? 'Adding...' : 'Add Holiday'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 text-slate-400 italic">
                    <i className="fa-solid fa-circle-info"></i>
                    <p className="text-xs font-bold uppercase tracking-widest">You can only view the holiday list.</p>
                </div>
            )}

            {/* 📜 List Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-8">Occasion</th>
                            <th className="p-8">Date</th>
                            {hasPermission && <th className="p-8 text-right">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {holidays.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50 font-bold group">
                                <td className="p-8 text-slate-800">{h.occasion}</td>
                                <td className="p-8 text-slate-500 font-medium">{h.date}</td>
                                {hasPermission && (
                                    <td className="p-8 text-right">
                                        <button onClick={() => deleteHoliday(h.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
