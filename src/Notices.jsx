import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Notices({ user }) {
    const [notices, setNotices] = useState([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => { fetchNotices(); }, []);

    const fetchNotices = async () => {
        const { data } = await supabase.from('notices').select('*').order('date', { ascending: false });
        setNotices(data || []);
    };

    const handleAddNotice = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('notices').insert([{ title, message, date: new Date().toISOString().split('T')[0] }]);
        if (error) alert(error.message);
        else { setTitle(''); setMessage(''); fetchNotices(); }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Noticeboard</h1>
            {isAdmin && (
                <form onSubmit={handleAddNotice} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
                    <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-5 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-slate-900" />
                    <textarea placeholder="Notice Message" value={message} onChange={e => setMessage(e.target.value)} required rows="4" className="w-full p-5 bg-slate-50 rounded-2xl border-none text-sm font-medium focus:ring-2 focus:ring-slate-900"></textarea>
                    <button disabled={loading} className="w-full bg-slate-950 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest">Post Notice</button>
                </form>
            )}
            <div className="space-y-6">
                {notices.map(n => (
                    <div key={n.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{n.title}</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-1 mb-4">{n.date}</p>
                        <p className="text-slate-600 text-sm font-medium">{n.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
