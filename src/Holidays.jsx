import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Holidays({ user }) {
    const [holidays, setHolidays] = useState([]);
    const [occasion, setOccasion] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(''); // নতুন: শেষ তারিখের জন্য
    const [loading, setLoading] = useState(false);
    
    const userRole = user?.role?.toLowerCase() || '';
    const hasPermission = userRole === 'admin' || userRole === 'manager';

    useEffect(() => { fetchHolidays(); }, []);

    const fetchHolidays = async () => {
        const { data } = await supabase.from('holidays').select('*').order('date', { ascending: true });
        setHolidays(data || []);
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            let holidayEntries = [];
            
            if (endDate && endDate !== startDate) {
                // টানা ছুটির লজিক
                let curr = new Date(startDate);
                let last = new Date(endDate);
                while (curr <= last) {
                    holidayEntries.push({ occasion, date: curr.toISOString().split('T')[0] });
                    curr.setDate(curr.getDate() + 1);
                }
            } else {
                // একদিনের ছুটি
                holidayEntries.push({ occasion, date: startDate });
            }

            const { error } = await supabase.from('holidays').insert(holidayEntries);
            if (error) throw error;

            setOccasion(''); setStartDate(''); setEndDate('');
            fetchHolidays();
            alert("Holidays Updated Successfully!");
        } catch (error) {
            alert(error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 p-4 pb-20">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Holiday Management</h1>
            
            {hasPermission && (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Add Holidays (Range Supported)</p>
                    <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Occasion (e.g. Eid-ul-Fitr)" value={occasion} onChange={e => setOccasion(e.target.value)} required className="md:col-span-2 p-5 bg-slate-50 rounded-2xl border-none font-bold text-sm" />
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="p-5 bg-slate-50 rounded-2xl border-none font-bold text-sm" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">End Date (Optional)</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-5 bg-slate-50 rounded-2xl border-none font-bold text-sm" />
                        </div>
                        <button disabled={loading} className="md:col-span-2 bg-slate-950 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
                            {loading ? 'Processing...' : 'Sync Holidays'}
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduled Holidays</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {holidays.map(h => (
                        <div key={h.id} className="p-8 flex justify-between items-center group hover:bg-slate-50 transition-all">
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm uppercase">{h.occasion}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-1">{h.date}</p>
                            </div>
                            {hasPermission && (
                                <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('holidays').delete().eq('id', h.id); fetchHolidays(); } }} className="text-slate-200 hover:text-red-500 transition-colors p-2">
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
