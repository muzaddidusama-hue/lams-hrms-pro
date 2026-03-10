import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

export default function Layout({ user, onLogout }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        fetchPendingCount();
        if (isAdmin) {
            // চ্যানেল নাম একদম ইউনিক এবং গ্লোবাল করা হয়েছে
            const channel = supabase.channel('lams_realtime_global')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaves' }, (payload) => {
                    fetchPendingCount();
                    setToast(`New Request: ${payload.new.name}`);
                    setTimeout(() => setToast(null), 5000);
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leaves' }, () => {
                    fetchPendingCount();
                })
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [isAdmin]);

    const fetchPendingCount = async () => {
        const { count } = await supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
        setPendingLeaves(count || 0);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
            {/* 🔔 নোটিফিকেশন - নিচের ডান কর্নারে ফিক্সড */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-[slideIn_0.4s_ease-out] border border-white/10">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <p className="font-black text-[10px] uppercase tracking-widest leading-none">{toast}</p>
                </div>
            )}

            <aside className={`fixed lg:static inset-y-0 left-0 z-[50] w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* সাইডবার কন্টেন্ট... */}
                <div className="h-28 flex items-center px-10"><span className="text-xl font-black text-slate-950 tracking-tighter uppercase">Lams Power</span></div>
                <nav className="flex-1 px-6 space-y-2">
                    {[
                        { path: '/', icon: 'fa-house', label: 'Dashboard' },
                        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leaves', badge: pendingLeaves },
                        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payroll' },
                        { path: '/profile', icon: 'fa-user', label: 'Profile' }
                    ].map(item => (
                        <button key={item.path} onClick={() => {navigate(item.path); setIsSidebarOpen(false);}} className={`flex items-center justify-between w-full p-4 rounded-2xl ${location.pathname === item.path ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400'}`}>
                            <div className="flex items-center gap-4"><i className={`fa-solid ${item.icon} w-5`}></i><span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span></div>
                            {item.badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{item.badge}</span>}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto px-6 lg:px-16 pb-20 pt-8 relative">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden absolute top-8 left-6 z-[60] text-slate-900 text-2xl"><i className="fa-solid fa-bars-staggered"></i></button>
                <Outlet />
            </main>

            <style>{`
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
