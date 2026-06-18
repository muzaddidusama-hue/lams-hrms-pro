import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Attendance({ user }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [logs, setLogs] = useState([]);
    const [requests, setRequests] = useState([]);
    const [viewMode, setViewMode] = useState('daily');
    const [activeTab, setActiveTab] = useState('logs');
    const [loading, setLoading] = useState(true);

    const [geoSettings, setGeoSettings] = useState({ lat: '', lng: '', radius: '' });

    // প্রপ্স থেকে ইউজার নেওয়া, না পেলে লোকালস্টোরেজ
    const currentUser = user || JSON.parse(localStorage.getItem('lams_user'));
    const role = currentUser?.role?.toLowerCase() || "";
    const isAdmin = role === 'admin' || role === 'manager' || currentUser?.id === 'admin' || currentUser?.emp_id === 'emp110';

    useEffect(() => {
        fetchAllData();
    }, [selectedEmp, viewMode, activeTab]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const { data: empData } = await supabase.from('employees').select('*').order('name');
                setEmployees(empData || []);

                const { data: geoData } = await supabase.from('company_settings').select('*').eq('id', 1).single();
                if (geoData) setGeoSettings({ lat: geoData.office_lat, lng: geoData.office_lng, radius: geoData.office_radius });
            }

            // Logs
            const today = new Date().toLocaleDateString('sv-SE'); 
            let logQuery = supabase.from('attendance').select('*');
            if (isAdmin) {
                if (viewMode === 'daily') logQuery = logQuery.eq('date', today);
                else if (selectedEmp) logQuery = logQuery.eq('emp_id', selectedEmp);
                else logQuery = logQuery.limit(50);
            } else {
                logQuery = logQuery.eq('emp_id', currentUser?.emp_id);
            }
            const { data: logData } = await logQuery.order('date', { ascending: false }).order('time_in', { ascending: false });
            setLogs(logData || []);

            // Requests
            let reqQuery = supabase.from('outside_requests').select('*').order('id', { ascending: false });
            if (!isAdmin) reqQuery = reqQuery.eq('emp_id', currentUser?.emp_id);
            const { data: reqData } = await reqQuery;
            setRequests(reqData || []);

        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // --- Admin Functions ---
    const handleUpdateGeoSettings = async (e) => {
        e.preventDefault();
        try {
            await supabase.from('company_settings').upsert({ 
                id: 1, 
                office_lat: geoSettings.lat, 
                office_lng: geoSettings.lng, 
                office_radius: geoSettings.radius 
            });
            alert("Office Location Updated!");
            fetchAllData();
        } catch (err) { alert("Error updating location!"); }
    };

    const toggleRemoteStatus = async (emp_id, currentStatus) => {
        try {
            await supabase.from('employees').update({ is_remote: !currentStatus }).eq('emp_id', emp_id);
            fetchAllData();
        } catch (err) { alert("Error updating status"); }
    };

    const handleRequestStatus = async (id, status) => {
        try {
            await supabase.from('outside_requests').update({ status }).eq('id', id);
            fetchAllData();
        } catch (err) { alert("Error updating request"); }
    };

    if (loading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
            <div className="relative flex items-center justify-center">
                {/* বাইরের ঘূর্ণায়মান রিং */}
                <div className="w-20 h-20 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
                {/* ভেতরের পালস আইকন */}
                <div className="absolute text-slate-950 text-xl animate-pulse">
                    <i className="fa-solid fa-bolt"></i>
                </div>
            </div>
            <h2 className="mt-6 text-xs font-black text-slate-900 tracking-[0.5em] uppercase uppercase italic animate-pulse">
                Lams Power
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Syncing Secure Workspace...
            </p>
        </div>
    );
}

    // 👨‍💼 ================= REGULAR EMPLOYEE VIEW =================
    if (!isAdmin) {
        return (
            <div className="max-w-5xl mx-auto space-y-10 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">My Attendance Log</h1>
                
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[300px]">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Date</th>
                                <th className="p-6">Check In</th>
                                <th className="p-6">Check Out</th>
                                <th className="p-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.length > 0 ? logs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-all font-bold">
                                    <td className="p-6 text-xs text-slate-900 uppercase tracking-widest">{new Date(log.date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-6 font-mono text-xs text-slate-500">{log.time_in}</td>
                                    <td className="p-6 font-mono text-xs text-slate-500">{log.time_out || '--:--'}</td>
                                    <td className="p-6 text-right">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase ${log.time_out ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500 animate-pulse'}`}>{log.time_out ? 'Finished' : 'On Duty'}</span>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="4" className="p-10 text-center font-bold text-slate-300 uppercase text-xs italic">No Logs Found</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Employee's Outside Requests Status */}
                {requests.length > 0 && (
                    <div className="space-y-4 pt-6">
                        <h2 className="text-lg font-black text-slate-900 uppercase">My Outside Requests</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Date: {req.date}</p>
                                            <p className="font-bold text-slate-900 text-sm mt-1">{req.place}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${req.status === 'Approved' ? 'bg-green-100 text-green-600' : (req.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-500')}`}>{req.status}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl">"{req.purpose}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 👑 ================= ADMIN HUB VIEW =================
    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Attendance Hub</h1>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setActiveTab('logs')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'logs' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>Logs</button>
                    <button onClick={() => setActiveTab('requests')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>
                        Requests {requests.filter(r => r.status === 'Pending').length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px]">{requests.filter(r => r.status === 'Pending').length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'settings' ? 'bg-white shadow-md text-slate-950' : 'text-slate-400'}`}>Settings</button>
                </div>
            </div>

            {/* TAB: LOGS */}
            {activeTab === 'logs' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex bg-slate-100 p-1.5 rounded-xl w-full md:w-auto">
                            <button onClick={() => { setViewMode('daily'); setSelectedEmp(''); }} className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'daily' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Today's Log</button>
                            <button onClick={() => setViewMode('individual')} className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'individual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>By Staff</button>
                        </div>
                        {viewMode === 'individual' && (
                            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} className="w-full md:w-64 p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none">
                                <option value="">Select Employee...</option>
                                {employees.map(emp => <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>)}
                            </select>
                        )}
                    </div>
                    
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-6">Employee</th>
                                    <th className="p-6">Check In</th>
                                    <th className="p-6">Check Out</th>
                                    <th className="p-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.length > 0 ? logs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-all font-bold">
                                        <td className="p-6">
                                            <p className="text-xs text-slate-900">{log.name}</p>
                                            <p className="text-[9px] text-slate-400 uppercase mt-1">{log.date}</p>
                                        </td>
                                        <td className="p-6 font-mono text-xs text-slate-500">{log.time_in}</td>
                                        <td className="p-6 font-mono text-xs text-slate-500">{log.time_out || '--:--'}</td>
                                        <td className="p-6 text-right">
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase ${log.time_out ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500 animate-pulse'}`}>{log.time_out ? 'Finished' : 'On Duty'}</span>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="4" className="p-10 text-center font-bold text-slate-300 uppercase text-xs italic">No Logs Found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: REQUESTS */}
            {activeTab === 'requests' && (
                <div className="space-y-6">
                    <h2 className="text-lg font-black text-slate-900 uppercase">Outside Approvals</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {requests.length > 0 ? requests.map(req => (
                            <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{req.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">For: {req.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${req.status === 'Approved' ? 'bg-green-100 text-green-600' : (req.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-500')}`}>{req.status}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 space-y-1">
                                    <p><span className="font-bold text-slate-400 uppercase text-[9px]">Place:</span> {req.place}</p>
                                    <p><span className="font-bold text-slate-400 uppercase text-[9px]">Purpose:</span> {req.purpose}</p>
                                </div>
                                {req.photo_url && (
                                    <a href={req.photo_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline"><i className="fa-solid fa-paperclip mr-1"></i>View Attachment</a>
                                )}
                                {req.status === 'Pending' && (
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => handleRequestStatus(req.id, 'Approved')} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold text-xs uppercase">Approve</button>
                                        <button onClick={() => handleRequestStatus(req.id, 'Rejected')} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-xs uppercase">Reject</button>
                                    </div>
                                )}
                            </div>
                        )) : <p className="text-slate-400 text-sm italic py-10 w-full text-center">No requests found.</p>}
                    </div>
                </div>
            )}

            {/* TAB: SETTINGS (ADMIN ONLY) */}
            {activeTab === 'settings' && (
                <div className="space-y-8">
                    {/* Map Settings */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 uppercase">Office Geo-Fence Settings</h2>
                        
                        {/* 📍 Current Setup Display */}
                        <div className="bg-slate-950 p-6 rounded-2xl flex flex-col md:flex-row gap-6 md:gap-12 text-white items-center">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Latitude</p>
                                <p className="font-mono text-lg">{geoSettings.lat || 'Not Set'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Longitude</p>
                                <p className="font-mono text-lg">{geoSettings.lng || 'Not Set'}</p>
                            </div>
                            <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Active Radius</p>
                                <p className="text-3xl font-black">{geoSettings.radius ? `${geoSettings.radius} Meters` : 'Not Set'}</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateGeoSettings} className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Update Location Coordinates</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Latitude</label>
                                    <input type="number" step="any" value={geoSettings.lat} onChange={e => setGeoSettings({...geoSettings, lat: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold text-sm outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Longitude</label>
                                    <input type="number" step="any" value={geoSettings.lng} onChange={e => setGeoSettings({...geoSettings, lng: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold text-sm outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Radius (Meters)</label>
                                    <input type="number" value={geoSettings.radius} onChange={e => setGeoSettings({...geoSettings, radius: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold text-sm outline-none" required />
                                </div>
                            </div>
                            <button type="submit" className="bg-slate-950 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-wider w-full md:w-auto shadow-lg active:scale-95 transition-all mt-4">Save Configuration</button>
                        </form>
                    </div>

                    {/* Remote Staff Toggle */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 uppercase">Permanent Remote Staff (Outside Dhaka)</h2>
                        <p className="text-xs text-slate-500 mb-4">Enabled employees bypass the office geo-fence but must submit a live photo during check-in.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {employees.map(emp => (
                                <div key={emp.emp_id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{emp.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">{emp.emp_id}</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleRemoteStatus(emp.emp_id, emp.is_remote)} 
                                        className={`w-14 h-8 flex items-center rounded-full p-1 transition-all ${emp.is_remote ? 'bg-green-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${emp.is_remote ? 'translate-x-6' : ''}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}