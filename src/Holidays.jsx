import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Holidays({ user }) {
    const [holidays, setHolidays] = useState([]);
    const [occasion, setOccasion] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => { fetchHolidays(); }, []);

    const fetchHolidays = async () => {
        const { data } = await supabase.from('holidays').select('*').order('date', { ascending: true });
        setHolidays(data || []);
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('holidays').insert([{ occasion, date }]);
        if (!error) {
            setOccasion(''); setDate(''); fetchHolidays();
        }
        setLoading(false);
    };

    const deleteHoliday = async (id) => {
        if(confirm("ছুটিটি মুছে ফেলবেন?")) {
            await supabase.from('holidays').delete().eq('id', id);
            fetchHolidays();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 p-4 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Holiday Management</h1>
            
            {isAdmin && (
                <form onSubmit={handleAddHoliday} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder="Holiday Occasion" value={occasion} onChange={e => setOccasion(e.target.value)} required className="flex-1 p-4 bg-slate-50 rounded-xl border-none font-bold text-sm" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="p-4 bg-slate-50 rounded-xl border-none font-bold text-sm" />
                    <button disabled={loading} className="bg-slate-950 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                        {loading ? 'Adding...' : 'Add Holiday'}
                    </button>
                </form>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="p-6">Occasion</th><th className="p-6">Date</th>{isAdmin && <th className="p-6 text-right">Action</th>}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {holidays.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50 font-bold group">
                                <td className="p-6 text-slate-800">{h.occasion}</td>
                                <td className="p-6 text-slate-500 font-medium">{h.date}</td>
                                {isAdmin && (
                                    <td className="p-6 text-right">
                                        <button onClick={() => deleteHoliday(h.id)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
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
