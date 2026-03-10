import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ user }) {
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {
        const fetchDashboardInfo = async () => {
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            const [nRes, hRes] = await Promise.all([
                supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(2),
                supabase.from('holidays').select('*').gte('date', today).lte('date', nextWeek.toISOString().split('T')[0])
            ]);
            setNotices(nRes.data || []);
            setHolidays(hRes.data || []);
        };
        fetchDashboardInfo();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            {/* ... আগের ক্লক-ইন এবং স্ট্যাটাস কার্ডগুলো এখানে থাকবে ... */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Notice Board */}
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3"><i className="fa-solid fa-bullhorn text-orange-500"></i> Notice Board</h3>
                    <div className="space-y-6">
                        {notices.map(n => (
                            <div key={n.id} className="p-6 bg-slate-50 rounded-2xl border-l-4 border-slate-950 shadow-sm">
                                <p className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tight">{n.title}</p>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Holiday List */}
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3"><i className="fa-solid fa-calendar-star text-blue-500"></i> Upcoming Holidays</h3>
                    <div className="space-y-4">
                        {holidays.map(h => (
                            <div key={h.id} className="flex items-center justify-between p-4 border-b border-slate-50">
                                <span className="font-bold text-slate-800 text-xs">{h.title}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{h.date}</span>
                            </div>
                        ))}
                        <div className="flex justify-between p-4 text-slate-400"><span className="text-xs font-bold italic">Every Friday</span><span className="text-[9px] font-black uppercase">Weekly Off</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
