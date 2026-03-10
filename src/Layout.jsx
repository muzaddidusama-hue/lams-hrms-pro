import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

export default function Layout({ user, onLogout }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadNotices, setUnreadNotices] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        const channel = supabase.channel('global-notices')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices' }, () => {
                setUnreadNotices(prev => prev + 1);
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const navItems = [
        { path: '/', icon: 'fa-house', label: 'Dashboard' },
        ...(isAdmin ? [{ path: '/team', icon: 'fa-users', label: 'Staff Force' }] : []),
        { path: '/attendance', icon: 'fa-calendar-check', label: 'Attendance' },
        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leaves' },
        { path: '/holidays', icon: 'fa-umbrella-beach', label: 'Holidays' },
        { path: '/notices', icon: 'fa-bullhorn', label: 'Noticeboard', badge: unreadNotices },
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payroll' },
        { path: '/profile', icon: 'fa-user-gear', label: 'Profile' }
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
            <aside className={`fixed lg:static inset-y-0 left-0 z-[90] w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-28 flex items-center px-10"><span className="text-xl font-black text-slate-950 uppercase tracking-tighter italic">Lams Power</span></div>
                <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <button key={item.path} onClick={() => { navigate(item.path); setIsSidebarOpen(false); if(item.label === 'Noticeboard') setUnreadNotices(0); }} className={`flex items-center justify-between w-full p-4 rounded-2xl transition-all ${location.pathname === item.path ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4"><i className={`fa-solid ${item.icon} w-5`}></i><span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span></div>
                            {item.badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{item.badge}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-8 border-t border-slate-50"><button onClick={onLogout} className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-all"><i className="fa-solid fa-power-off"></i> Logout</button></div>
            </aside>
            <main className="flex-1 overflow-y-auto relative px-6 lg:px-16 pb-20 pt-8">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden absolute top-8 left-6 z-[60] text-slate-900 text-2xl"><i className="fa-solid fa-bars-staggered"></i></button>
                <Outlet />
            </main>
        </div>
    );
}
