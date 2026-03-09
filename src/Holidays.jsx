import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Holidays() {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [hDate, setHDate] = useState('');
    const [hName, setHName] = useState('');

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        setLoading(true);
        const { data } = await supabase.from('holidays').select('*').order('date', { ascending: true });
        if (data) setHolidays(data);
        setLoading(false);
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        try {
            await supabase.from('holidays').insert([{ date: hDate, occasion: hName }]);
            setHDate(''); setHName('');
            fetchHolidays();
            alert("Holiday Added! 🌴");
        } catch (error) {
            alert("Error adding holiday");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-[fadeIn_0.4s_ease-out]">
            
            {/* Add Holiday Box */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6">Add New Holiday</h3>
                <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-4">
                    <input type="date" required value={hDate} onChange={e => setHDate(e.target.value)} className="flex-1 p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 transition-all cursor-pointer" />
                    <input type="text" required placeholder="Occasion Name" value={hName} onChange={e => setHName(e.target.value)} className="flex-[2] p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-orange-500 transition-all" />
                    <button type="submit" className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all">Add Holiday</button>
                </form>
            </div>

            {/* Holiday List */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Upcoming Holidays</h3>
                {loading ? (
                    <div className="p-10 text-center"><div className="border-4 border-slate-200 border-t-orange-500 rounded-full w-8 h-8 animate-spin mx-auto"></div></div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {holidays.map((h, i) => (
                            <div key={i} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-orange-200 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{h.occasion}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                                    <i className="fa-solid fa-calendar-day"></i>
                                </div>
                            </div>
                        ))}
                        {holidays.length === 0 && <p className="text-center text-slate-400 text-sm font-bold tracking-widest uppercase py-8">No holidays found.</p>}
                    </div>
                )}
            </div>
            
        </div>
    );
}