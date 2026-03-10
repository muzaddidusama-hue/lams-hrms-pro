import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

export default function Layout({ user, onLogout }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        fetchPendingCount();
        if (isAdmin) {
            const leafChannel = supabase
                .channel('global-notifications')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchPendingCount())
                .subscribe();
            return () => supabase.removeChannel(leafChannel);
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
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payroll' }
    ] : [
        { path: '/', icon: 'fa-house', label: 'Home' }, 
        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leaves' }, 
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payslip' }
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
            
            {/* 📱 মোবাইল মেনু বাটন (সবসময় উপরে থাকবে) */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="lg:hidden fixed bottom-8 right-8 z-[100] w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all"
            >
                <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars-staggered'} text-xl`}></i>
            </button>

            {/* মোবাইল ওভারলে */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"></div>
            )}

            {/* প্রিমিয়াম সাইডবার */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-[90] w-72 bg-white border-r border-slate-100 flex flex-col shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-28 flex items-center px-10">
                    <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">Lams Power</span>
                </div>
                
                <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto">
                    {navItems.map((item) => (
                        <button 
                            key={item.path}
                            onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} 
                            className={`flex items-center justify-between w-full p-4 rounded-2xl transition-all ${location.pathname === item.path ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <i className={`fa-solid ${item.icon} w-5 text-sm`}></i>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-slate-50">
                    <button onClick={onLogout} className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-all">
                        <i className="fa-solid fa-power-off"></i> Logout
                    </button>
                </div>
            </aside>

            {/* মেইন কন্টেন্ট */}
            <main className="flex-1 overflow-y-auto relative w-full px-6 lg:px-16 pb-20 pt-8">
                <Outlet />
            </main>
        </div>
    );
}
