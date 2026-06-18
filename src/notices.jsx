import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Notices({ user }) {
    const [notices, setNotices] = useState([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // 🛠️ রোল চেকিং (Admin vs User)
    const currentUser = user || JSON.parse(localStorage.getItem('lams_user')) || {};
    const role = currentUser?.role?.toLowerCase() || "";
    const isAdmin = role === 'admin' || role === 'manager' || currentUser?.id === 'admin' || currentUser?.emp_id === 'emp110';

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('id', { ascending: false }); // লেটেস্ট নোটিশ সবার উপরে আসবে
        
        if (!error) setNotices(data || []);
        setFetching(false);
    };

    const handleAddNotice = async (e) => {
        e.preventDefault();
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        const { error } = await supabase.from('notices').insert([
            { title, message, date: today }
        ]);

        if (error) {
            alert(error.message);
        } else {
            setTitle('');
            setMessage('');
            fetchNotices();
        }
        setLoading(false);
    };

    const deleteNotice = async (id) => {
        if (!confirm("Are you sure you want to delete this notice?")) return;
        await supabase.from('notices').delete().eq('id', id);
        fetchNotices();
    };

    if (fetching) return <div className="h-full flex items-center justify-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Loading Notices...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-[fadeIn_0.5s_ease-out] pb-20 px-2 mt-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Noticeboard</h1>

            {/* 🛠️ Admin Panel to Post Notice */}
            {isAdmin && (
                <form onSubmit={handleAddNotice} className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Global Announcement System</p>
                    <input 
                        type="text" 
                        placeholder="Notice Headline" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                        className="w-full p-5 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-slate-950 transition-all outline-none" 
                    />
                    <textarea 
                        placeholder="Write details here..." 
                        value={message} 
                        onChange={e => setMessage(e.target.value)} 
                        required 
                        rows="4" 
                        className="w-full p-5 bg-slate-50 rounded-2xl border-none text-sm font-medium focus:ring-2 focus:ring-slate-950 transition-all outline-none"
                    ></textarea>
                    <button 
                        disabled={loading} 
                        className="w-full bg-slate-950 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:bg-slate-400"
                    >
                        {loading ? 'Publishing...' : 'Post Notice'}
                    </button>
                </form>
            )}

            {/* 📜 Notice Feed */}
            <div className="space-y-6">
                {notices.length > 0 ? (
                    notices.map(n => (
                        <div key={n.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{n.title}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        <i className="fa-solid fa-calendar-day mr-2"></i> {new Date(n.date).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                                
                                {/* 🛠️ Delete Button for Admin */}
                                {isAdmin && (
                                    <button 
                                        onClick={() => deleteNotice(n.id)} 
                                        className="bg-red-50 text-red-500 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        title="Delete Notice"
                                    >
                                        <i className="fa-solid fa-trash-can text-sm"></i>
                                    </button>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed font-medium bg-slate-50/50 p-6 rounded-2xl border border-slate-50 whitespace-pre-wrap">
                                {n.message}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                        <p className="font-bold text-slate-400 uppercase tracking-widest italic">No announcements found</p>
                    </div>
                )}
            </div>
        </div>
    );
}