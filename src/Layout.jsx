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
            const channel = supabase.channel('layout-global')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaves' }, (payload) => {
                    fetchPendingCount();
                    setToast(`New Request: ${payload.new.name}`);
                    setTimeout(() => setToast(null), 5000);
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchPendingCount())
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [isAdmin]);

    const fetchPendingCount = async () => {
        const { count } = await supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
        setPendingLeaves(count || 0);
    };

    const navItems = isAdmin ? [
        { path: '/', icon: 'fa-house', label: 'Dashboard' }, 
        { path: '/team', icon: 'fa-users', label: 'Staff Force' }, 
        { path: '/attendance', icon: 'fa-calendar-check', label: 'Attendance' }, 
        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leaves', badge: pendingLeaves }, 
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payroll' },
        { path: '/profile', icon: 'fa-user-gear', label: 'Profile' }
    ] : [
        { path: '/', icon: 'fa-house', label: 'Home' }, 
        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leaves' }, 
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payslip' },
        { path: '/profile', icon: 'fa-user', label: 'Profile' }
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
            {/* 🔔 Toast - Bottom Right */}
            {toast && (
                <div className="fixed bottom-10 right-10 z-[1000] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-[slideIn_0.3s_ease-out] border border-white/10">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <p className="font-black text-[10px] uppercase tracking-widest">{toast}</p>
                </div>
            )}

            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden fixed bottom-8 right-8 z-[100] w-14 h-14 bg-slate-950 text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-90"><i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars-staggered'}`}></i></button>

            <aside className={`fixed lg:static inset-y-0 left-0 z-[90] w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-28 flex items-center px-10"><span className="text-xl font-black text-slate-950 tracking-tighter uppercase italic">Lams Power</span></div>
                <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto">
                    {navItems.map((item) => (
                        <button key={item.path} onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} className={`flex items-center justify-between w-full p-4 rounded-2xl transition-all ${location.pathname === item.path ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4"><i className={`fa-solid ${item.icon} w-5 text-sm`}></i><span className="text-[10px] font-black uppercase tracking-[0.3em]">{item.label}</span></div>
                            {item.badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{item.badge}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-8 border-t border-slate-50"><button onClick={onLogout} className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-all"><i className="fa-solid fa-power-off"></i> Logout</button></div>
            </aside>

            <main className="flex-1 overflow-y-auto relative w-full px-6 lg:px-16 pb-20 pt-8">
                <header className="flex justify-end mb-8">
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-4 p-2 pr-5 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <img src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=0f172a&color=fff`} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="hidden sm:block text-right"><p className="text-[10px] font-black text-slate-900 leading-none mb-1">{user?.name?.split(' ')[0]}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{user?.role}</p></div>
                    </div>
                </header>
                <Outlet />
            </main>
            <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
    );
}
