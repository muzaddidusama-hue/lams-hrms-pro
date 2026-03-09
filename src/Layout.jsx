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

    // 🚀 লাইভ ডাটাবেজ লিসেনার (ম্যাজিক!)
    useEffect(() => {
        if (isAdmin) {
            // শুরুতে কয়টা পেন্ডিং ছুটি আছে তা গোনা
            fetchPendingCount();

            // Supabase Realtime: কেউ নতুন লিভ রিকোয়েস্ট করলে সাথে সাথে ধরবে
            const channel = supabase
                .channel('realtime-leaves')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaves' }, (payload) => {
                    if (payload.new.status === 'Pending') {
                        setPendingLeaves(prev => prev + 1); // ব্যাজ +১ হবে
                        showToast(`🔔 New Leave Request from ${payload.new.name}!`); // পপআপ দেখাবে
                        
                        // একটি ছোট্ট সাউন্ড প্লে হবে (অপশনাল)
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.play().catch(e => console.log(e));
                    }
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [isAdmin]);

    const fetchPendingCount = async () => {
        const { count } = await supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
        setPendingLeaves(count || 0);
    };

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 5000); // ৫ সেকেন্ড পর পপআপ চলে যাবে
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

    const getPageTitle = () => {
        const item = navItems.find(i => i.path === location.pathname);
        return item ? item.label : 'LAMS HR';
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-600 antialiased relative">
            
            {/* Live Popup Notification (Toast) */}
            {toastMsg && (
                <div className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideInRight_0.4s_ease-out]">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="font-bold text-sm tracking-wide">{toastMsg}</p>
                </div>
            )}

            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"></div>}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
                <div className="h-24 flex items-center px-8 border-b border-slate-800">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3"><i className="fa-solid fa-bolt text-white text-sm"></i></div>
                    <span className="text-lg font-bold tracking-tight">LAMS HR</span>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button 
                            key={item.path}
                            onClick={() => { navigate(item.path); setIsSidebarOpen(false); if(item.path === '/leaves') fetchPendingCount(); }} 
                            className={`group flex items-center justify-between w-full p-4 rounded-xl transition-all duration-200 ${location.pathname === item.path ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-4">
                                <i className={`fa-solid ${item.icon} w-5 text-center ${location.pathname === item.path ? 'text-white' : 'group-hover:text-orange-500'} transition-colors`}></i>
                                <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
                            </div>
                            
                            {/* ব্যাজ দেখানোর লজিক */}
                            {item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-bounce">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={onLogout} className="flex items-center gap-3 w-full p-4 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-xs font-bold uppercase tracking-wider">
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-sm active:scale-95">
                            <i className="fa-solid fa-bars text-lg"></i>
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
                            <p className="text-xs font-medium text-slate-400 mt-0.5 hidden sm:block">Pro Workspace</p>
                        </div>
                    </div>
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-4 pl-6 pr-2 py-2 bg-white border border-slate-100 rounded-full shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <div className="text-right hidden sm:block">
                            <h2 className="font-bold text-slate-800 text-sm leading-tight">{user?.name}</h2>
                            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">{user?.role}</p>
                        </div>
                        <img src={user?.photo || `https://ui-avatars.com/api/?name=${user?.name}&background=ea580c&color=fff`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover bg-slate-100" />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-10 scroll-smooth pb-20">
                    <Outlet /> 
                </div>
            </main>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
    );
}