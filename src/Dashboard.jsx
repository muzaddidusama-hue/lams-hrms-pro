import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Geolocation } from '@capacitor/geolocation'; 

const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371e3; 
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const deltaP = (lat2-lat1) * Math.PI/180;
    const deltaLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [todaysLog, setTodaysLog] = useState(null);
    const [loading, setLoading] = useState(true);

    const [geoConfig, setGeoConfig] = useState({ lat: 0, lng: 0, radius: 100 });
    const [isRemoteEmp, setIsRemoteEmp] = useState(false);
    const [outsideReqStatus, setOutsideReqStatus] = useState(null); 
    const [verifyingGeo, setVerifyingGeo] = useState(false);

    const [showReqModal, setShowReqModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [currentAction, setCurrentAction] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [reqDate, setReqDate] = useState('');
    const [reqPlace, setReqPlace] = useState('');
    const [reqPurpose, setReqPurpose] = useState('');

    const currentUser = user || JSON.parse(localStorage.getItem('lams_user')) || {};
    const role = currentUser?.role?.toLowerCase() || "";
    const isAdmin = role === 'admin' || role === 'manager' || currentUser?.id === 'admin' || currentUser?.emp_id === 'emp110';
    const empId = currentUser?.emp_id || 'unknown';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        fetchDashboardData();
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-CA');
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
            
            const [geoRes, profileRes, passRes] = await Promise.all([
                supabase.from('company_settings').select('*').eq('id', 1).maybeSingle(),
                supabase.from('employees').select('is_remote').eq('emp_id', empId).maybeSingle(),
                supabase.from('outside_requests').select('status').eq('emp_id', empId).eq('date', todayStr).maybeSingle()
            ]);

            if (geoRes.data) setGeoConfig({ lat: geoRes.data.office_lat || 0, lng: geoRes.data.office_lng || 0, radius: geoRes.data.office_radius || 100 });
            if (profileRes.data) setIsRemoteEmp(profileRes.data.is_remote);
            if (passRes.data) setOutsideReqStatus(passRes.data.status); 

            const [empRes, activeRes, totalPresentRes, noticeRes, holidayRes, leavesRes] = await Promise.all([
                supabase.from('employees').select('*', { count: 'exact', head: true }),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr).is('time_out', null),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                supabase.from('notices').select('*').order('date', { ascending: false }).limit(2),
                supabase.from('holidays').select('*').gte('date', todayStr).limit(3),
                supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
            ]);

            setStats({ total: empRes.count || 0, activeNow: activeRes.count || 0, absent: Math.max(0, (empRes.count || 0) - (totalPresentRes.count || 0)), leaves: leavesRes.count || 0 });

            if (!isAdmin) {
                const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('emp_id', empId).gte('date', firstDay);
                setMonthlyCount(count || 0);
            }

            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', empId).eq('date', todayStr).maybeSingle();
            setTodaysLog(myAtt || null);
            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleDutyCheck = async (action) => {
        setVerifyingGeo(true);
        try {
            const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            const lat = coordinates.coords.latitude;
            const lng = coordinates.coords.longitude;
            
            const distance = getDistance(lat, lng, geoConfig.lat, geoConfig.lng);
            const allowedRadius = geoConfig.radius || 150; 
            
            if (distance <= allowedRadius) {
                executeBiometricAuth(action, lat, lng, null);
            } else {
                if (isRemoteEmp || outsideReqStatus === 'Approved') {
                    setCurrentAction(action);
                    setShowPhotoModal(true); 
                } else if (outsideReqStatus === 'Pending') {
                    alert("Your Outside Duty Request is still Pending. Please wait for Admin approval.");
                } else {
                    alert(`You are ${Math.round(distance)} meters away from the office! Please connect from the office or submit an 'Outside Duty Request'.`);
                }
            }
        } catch (err) { alert("Turn on GPS/Location to check in!"); }
        setVerifyingGeo(false);
    };

    const handleRemoteCheckinWithPhoto = async (e) => {
        e.preventDefault();
        if (!photoFile) return alert("A live photo is required for outside check-in!");
        setUploading(true);
        try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `remote_${empId}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('attendance_docs').upload(fileName, photoFile);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('attendance_docs').getPublicUrl(fileName);
            setShowPhotoModal(false); setPhotoFile(null);
            executeBiometricAuth(currentAction, null, null, data.publicUrl);
        } catch (err) { alert("Error uploading photo. Try again."); }
        setUploading(false);
    };

    const executeBiometricAuth = async (action, lat = null, lng = null, photoUrl = null) => {
        if (!window.PublicKeyCredential) return alert("Biometric not supported on this device/browser.");
        try {
            const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
            const options = { publicKey: { challenge, rp: { name: "LAMS" }, user: { id: Uint8Array.from(currentUser?.id || 'default_id', c => c.charCodeAt(0)), name: currentUser?.email || 'user', displayName: currentUser?.name || 'user' }, pubKeyCredParams: [{ alg: -7, type: "public-key" }], authenticatorSelection: { authenticatorAttachment: "platform" }, timeout: 60000 } };
            const credential = await navigator.credentials.create(options);
            if (credential) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-CA');
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                if (action === 'clock_in') {
                    await supabase.from('attendance').insert([{ emp_id: currentUser.emp_id, name: currentUser.name, date: dateStr, time_in: timeStr, latitude: lat, longitude: lng, checkin_photo: photoUrl }]);
                } else {
                    await supabase.from('attendance').update({ time_out: timeStr, latitude: lat, longitude: lng }).eq('emp_id', currentUser.emp_id).eq('date', dateStr);
                }
                fetchDashboardData();
                alert(`Successfully ${action === 'clock_in' ? 'Checked-in' : 'Checked-out'}! ✅`);
            }
        } catch (err) { console.error(err); alert("Authentication Failed or Canceled!"); }
    };

    const submitOutsideRequest = async (e) => {
        e.preventDefault();
        if (!reqDate || !reqPlace || !reqPurpose) return alert("Please fill all required fields!");
        setUploading(true);
        let fileUrl = null;
        try {
            if (photoFile) {
                const fileName = `req_${empId}_${Date.now()}.${photoFile.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('attendance_docs').upload(fileName, photoFile);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('attendance_docs').getPublicUrl(fileName);
                fileUrl = data.publicUrl;
            }
            await supabase.from('outside_requests').insert([{ emp_id: currentUser.emp_id, name: currentUser.name, date: reqDate, purpose: reqPurpose, place: reqPlace, photo_url: fileUrl }]);
            setShowReqModal(false); setReqDate(''); setReqPlace(''); setReqPurpose(''); setPhotoFile(null);
            alert("Request sent to Admin successfully! 📨");
            fetchDashboardData();
        } catch (error) { alert("Error submitting request"); }
        setUploading(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-200 text-2xl animate-pulse tracking-[0.4em] uppercase">Lams Power</div>;

    return (
        <div className="max-w-[1300px] mx-auto space-y-12 pb-24 px-4 animate-[fadeIn_0.5s_ease-out]">
            
            <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-12 relative overflow-hidden">
                <div className="relative z-10 text-center lg:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-3 italic">Workspace Dashboard</p>
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">Assalamu Alaikum,<br/><span className="text-slate-400 italic font-normal">{currentUser?.name}</span></h1>
                </div>
                <div className="p-12 bg-slate-950 rounded-[3.5rem] shadow-2xl min-w-[320px] text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10">
                        <h2 className="text-6xl font-black text-white tracking-tighter">{currentTime}</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-4">Standard Time</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdmin ? (
                    <>
                        <StatCard label="Total Force" value={stats.total} />
                        <StatCard label="Live Now" value={stats.activeNow} isPositive />
                        <StatCard label="Away Today" value={stats.absent} isNegative />
                        <StatCard label="In Review" value={stats.leaves} isWarning />
                    </>
                ) : (
                    <>
                        <StatCard label="Present (This Month)" value={monthlyCount} isPositive />
                        <StatCard label="Today's Status" value={todaysLog ? "Present" : "Absent"} isPositive={todaysLog} isNegative={!todaysLog} />
                        <StatCard label="Profile Status" value="Active" />
                        <StatCard label="Notices" value={notices.length} />
                    </>
                )}
            </div>

            <div className="bg-slate-950 rounded-[3rem] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="flex flex-col gap-4 relative z-10 w-full md:w-auto">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center border border-white/10 text-white text-3xl transition-transform group-hover:scale-110 duration-500"><i className="fa-solid fa-fingerprint animate-pulse"></i></div>
                        <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic">Security Access</p><h2 className="text-3xl font-black text-white tracking-tight uppercase">Duty Control</h2></div>
                    </div>
                </div>

                {/* ✅ ডেস্কটপে পাশাপাশি এবং মোবাইলে নিচে নিচে বাটন */}
                <div className="w-full md:w-auto relative z-10 flex flex-col md:flex-row gap-4">
                    {/* মেইন বাটন */}
                    {!todaysLog ? (
                        <button onClick={() => handleDutyCheck('clock_in')} disabled={verifyingGeo} className="w-full md:w-72 py-6 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:bg-slate-300">{verifyingGeo ? 'Checking...' : 'Verify & Check-in'}</button>
                    ) : !todaysLog.time_out ? (
                        <button onClick={() => handleDutyCheck('clock_out')} disabled={verifyingGeo} className="w-full md:w-72 py-6 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:bg-red-300">{verifyingGeo ? 'Checking...' : 'Verify & Check-out'}</button>
                    ) : (
                        <div className="w-full md:w-72 py-6 bg-white/5 border border-white/10 text-white/30 rounded-2xl font-black text-[10px] uppercase text-center tracking-widest italic flex items-center justify-center">Duty Completed</div>
                    )}

                    {/* আউটসাইড ডিউটি বাটন */}
                    {!isAdmin && !todaysLog?.time_out && (
                        <>
                            {outsideReqStatus === 'Pending' ? (
                                <div className="w-full md:w-72 py-6 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase text-center tracking-widest flex items-center justify-center gap-2 shadow-xl">
                                    <i className="fa-solid fa-clock animate-pulse"></i> Pending Approval
                                </div>
                            ) : outsideReqStatus === 'Approved' ? (
                                <div className="w-full md:w-72 py-6 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase text-center tracking-widest flex items-center justify-center gap-2 shadow-xl">
                                    <i className="fa-solid fa-check-circle"></i> Outside Duty Approved
                                </div>
                            ) : outsideReqStatus === 'Rejected' ? (
                                <button onClick={() => setShowReqModal(true)} className="w-full md:w-72 py-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-rotate-right"></i> Rejected: Request Again
                                </button>
                            ) : (
                                <button onClick={() => setShowReqModal(true)} className="w-full md:w-72 py-6 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-location-arrow"></i> Request Outside Duty
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <BoardCard title="Notice Board" icon="fa-bullhorn" color="text-orange-500" items={notices} type="notice" />
                <BoardCard title="Upcoming Holidays" icon="fa-calendar-star" color="text-blue-500" items={holidays} type="holiday" />
            </div>

            {/* 📸 Modal: Outside Check-in Photo Upload (Direct Camera) */}
            {showPhotoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative">
                        <button onClick={() => setShowPhotoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
                        <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase">Remote Verification</h3>
                        <p className="text-xs font-bold text-slate-500 text-center mb-6">A live photo is required to check-in from outside the office.</p>
                        <form onSubmit={handleRemoteCheckinWithPhoto} className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center">
                                {/* ✅ File input with capture to open camera directly */}
                                <input type="file" accept="image/*" capture="user" onChange={e => setPhotoFile(e.target.files[0])} required className="text-xs font-bold text-slate-600 w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white cursor-pointer" />
                            </div>
                            <button type="submit" disabled={uploading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:bg-slate-400">{uploading ? 'Processing...' : 'Take Photo & Auth'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 📝 Modal: Outside Duty Request */}
            {showReqModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 relative animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setShowReqModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
                        <h3 className="text-2xl font-black text-slate-900 text-center mb-6">Outside Duty Request</h3>
                        <form onSubmit={submitOutsideRequest} className="space-y-4">
                            <input type="date" required value={reqDate} onChange={e => setReqDate(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" />
                            <input type="text" required placeholder="Location/Place" value={reqPlace} onChange={e => setReqPlace(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 font-bold text-sm outline-none" />
                            <textarea required placeholder="Purpose of visit..." value={reqPurpose} onChange={e => setReqPurpose(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 font-medium text-sm outline-none" rows="3"></textarea>
                            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Live Photo Proof</label>
                                {/* ✅ Open camera directly for request as well */}
                                <input type="file" accept="image/*" capture="environment" onChange={e => setPhotoFile(e.target.files[0])} className="text-xs font-bold text-slate-600 w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white cursor-pointer" />
                            </div>
                            <button type="submit" disabled={uploading} className="w-full bg-slate-950 text-white py-4 rounded-xl font-bold text-xs uppercase shadow-xl disabled:bg-slate-400">{uploading ? 'Submitting...' : 'Send Request'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, isPositive, isNegative, isWarning }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center hover:shadow-lg transition-all">
            <div className={`w-1 h-5 rounded-full mb-5 ${isPositive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : isNegative ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{typeof value === 'number' ? value.toString().padStart(2, '0') : value}</p>
        </div>
    );
}

function BoardCard({ title, icon, color, items, type }) {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-sm min-h-[350px]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3"><i className={`fa-solid ${icon} ${color}`}></i> {title}</h3>
            <div className="space-y-6">
                {items.length > 0 ? items.map((item, idx) => (
                    <div key={idx} className={`${type === 'notice' ? 'p-6 bg-slate-50 border-l-4 border-slate-950' : 'flex justify-between p-4 border-b border-slate-50'} rounded-2xl`}>
                        {type === 'notice' ? (
                            <><p className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tight">{item.title}</p><p className="text-[10px] text-slate-500 font-medium">{item.message}</p></>
                        ) : (
                            <><span className="font-bold text-slate-800 text-xs">{item.occasion}</span><span className="text-[9px] font-black uppercase text-slate-400">{item.date}</span></>
                        )}
                    </div>
                )) : <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest italic">No Data Sync</p>}
            </div>
        </div>
    );
}