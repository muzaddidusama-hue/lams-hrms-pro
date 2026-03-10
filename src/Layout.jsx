import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ user, onLogout }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    const navItems = [
        { path: '/', icon: 'fa-house', label: 'Dashboard' },
        ...(isAdmin ? [{ path: '/team', icon: 'fa-users', label: 'Staff Force' }] : []),
        { path: '/attendance', icon: 'fa-calendar-check', label: 'Attendance' },
        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leaves' },
        { path: '/holidays', icon: 'fa-umbrella-beach', label: 'Holidays' },
        { path: '/notices', icon: 'fa-bullhorn', label: 'Noticeboard' },
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payroll' },
        { path: '/profile', icon: 'fa-user-gear', label: 'Profile' }
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans relative">
            {/* Sidebar with dynamic z-index and overlay */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-[100] w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-28 flex items-center px-10 font-black text-slate-950 uppercase italic text-xl">Lams Power</div>
                <nav className="flex-1 px-6 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button key={item.path} onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all ${location.pathname === item.path ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                            <i className={`fa-solid ${item.icon} w-5 text-sm`}></i>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Dark Overlay for mobile */}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden"></div>}

            <main className="flex-1 overflow-y-auto relative">
                {/* Mobile Top Bar - Fixed to prevent overlap */}
                <header className="lg:hidden h-20 bg-white/80 backdrop-blur-md border-b border-slate-50 sticky top-0 z-[80] flex items-center justify-between px-6">
                    <span className="font-black text-slate-900 uppercase italic">Lams</span>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-950 text-white rounded-xl shadow-lg">
                        <i className="fa-solid fa-bars-staggered"></i>
                    </button>
                </header>

                <div className="p-6 lg:p-16">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
