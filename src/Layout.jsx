import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

export default function Layout({ user, onLogout }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.id?.toLowerCase() === 'admin';

    useEffect(() => {
        // শুরুতে ডাটা নিয়ে আসা
        fetchPendingCount();

        if (isAdmin) {
            // 🚀 সুপার আপডেট: সব ধরনের চেঞ্জ (Insert, Update, Delete) মনিটর করবে
            const leafChannel = supabase
                .channel('realtime-nav-badge')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'leaves' 
                }, (payload) => {
                    // যদি নতুন রিকোয়েস্ট আসে তবে টোস্ট মেসেজ দেখাবে
                    if (payload.eventType === 'INSERT' && payload.new.status === 'Pending') {
                        showToast(`🔔 New Leave Request from ${payload.new.name}!`);
                        // নোটিফিকেশন সাউন্ড
                        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
                    }
                    // ডাটাবেজে যেকোনো চেঞ্জ হলে ব্যাজ আপডেট করবে
                    fetchPendingCount();
                })
                .subscribe();

            return () => supabase.removeChannel(leafChannel);
        }
    }, [isAdmin]);

    const fetchPendingCount = async () => {
        const { count } = await supabase
            .from('leaves')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending');
        setPendingLeaves(count || 0);
    };

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 5000);
    };

    const navItems = isAdmin ? [
        { path: '/', icon: 'fa-house', label: 'Dashboard' }, 
        { path: '/team', icon: 'fa-users', label: 'Team Directory' }, 
        { path: '/attendance', icon: 'fa-calendar-check', label: 'Attendance Log' }, 
        { path: '/leaves', icon: 'fa-paper-plane', label: 'Leave Requests', badge: pendingLeaves }, 
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'Payroll' }, 
        { path: '/holidays', icon: 'fa-calendar-plus', label: 'Holidays' },
        { path: '/profile', icon: 'fa-gear', label: 'Settings' }
    ] : [
        { path: '/', icon: 'fa-house', label: 'Home' }, 
        { path: '/leaves', icon: 'fa-paper-plane', label: 'My Leaves' }, 
        { path: '/payroll', icon: 'fa-sack-dollar', label: 'My Payslip' }, 
        { path: '/profile', icon: 'fa-user', label: 'My Profile' }
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-600 antialiased relative">
            
            {/* 🔔 লাইভ টোস্ট নোটিফিকেশন */}
            {toastMsg && (
                <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-[slideInRight_0.4s_ease-out] border border-white/10 backdrop-blur-md">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <p className="font-bold text-xs tracking-widest uppercase">{toastMsg}</p>
                </div>
            )}

            {/* মোবাইল সাইডবার ওভারলে */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"></div>
            )}

            {/* 📱 প্রিমিয়াম সাইডবার */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col border-r border-slate-100 shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
                <div className="h-24 flex items-center px-8">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center mr-3 shadow-lg shadow-slate-200">
                        <i className="fa-solid fa-bolt text-white text-sm"></i>
                    </div>
                    <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">Lams Power</span>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
                    {navItems.map((item) => (
                        <button 
                            key={item.path}
                            onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} 
                            className={`group flex items-center justify-between w-full p-4 rounded-2xl transition-all duration-300 ${location.pathname === item.path ? 'bg-slate-900 text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <div className="flex items-center gap-4">
                                <i className={`fa-solid ${item.icon} w-5 text-center text-sm ${location.pathname === item.path ? 'text-white' : 'group-hover:text-slate-900'}`}></i>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-md animate-bounce">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-50">
                    <button onClick={onLogout} className="flex items-center gap-4 w-full p-4 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <i className="fa-solid fa-power-off"></i> Logout
                    </button>
                </div>
            </aside>

            {/* 🚀 মেইন কন্টেন্ট এরিয়া */}
            <main className="flex-1 flex flex-col overflow-hidden relative w-full bg-slate-50/30">
                <header className="h-20 md:h-24 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm active:scale-90 transition-all">
                        <i className="fa-solid fa-bars-staggered"></i>
                    </button>
                    
                    <div className="hidden lg:block">
                        <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.4em]">Corporate Management System</h2>
                    </div>

                    <div onClick={() => navigate('/profile')} className="flex items-center gap-4 p-1.5 pr-4 bg-white border border-slate-100 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95">
                        <img 
                            src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=0f172a&color=fff`} 
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border-2 border-slate-50 shadow-inner" 
                        />
                        <div className="hidden md:block">
                            <h2 className="font-black text-slate-900 text-xs tracking-tight">{user?.name?.split(' ')[0]}</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user?.role}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-20 pt-4">
                    <Outlet /> 
                </div>
            </main>

            <style>{`
                @keyframes slideInRight { 
                    from { transform: translateX(100%); opacity: 0; } 
                    to { transform: translateX(0); opacity: 1; } 
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
