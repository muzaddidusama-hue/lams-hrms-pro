import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Geolocation } from '@capacitor/geolocation'; 
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';
import Swal from 'sweetalert2';

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

const calculateActiveTime = (timeInStr, timeOutStr) => {
    if (!timeInStr) return "00:00:00";
    const now = new Date();
    const [inHr, inMin, inSec] = timeInStr.split(':').map(Number);
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), inHr, inMin, inSec || 0);
    
    let endTime = now;
    if (timeOutStr) {
        const [outHr, outMin, outSec] = timeOutStr.split(':').map(Number);
        endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), outHr, outMin, outSec || 0);
    }

    const diffMs = Math.max(0, endTime - startTime);
    const hrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
    const mins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
    const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
    return `${hrs}h ${mins}m ${secs}s`;
};

export default function Dashboard({ user }) {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [stats, setStats] = useState({ total: 0, activeNow: 0, absent: 0, leaves: 0 });
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [notices, setNotices] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [todaysLog, setTodaysLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [workDuration, setWorkDuration] = useState('00h 00m 00s');

    const [geoConfig, setGeoConfig] = useState({ lat: 0, lng: 0, radius: 100 });
    const [outsideReqStatus, setOutsideReqStatus] = useState(null); 
    const [verifyingGeo, setVerifyingGeo] = useState(false);

    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [currentAction, setCurrentAction] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [outDescription, setOutDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    const currentUser = user || JSON.parse(localStorage.getItem('lams_user')) || {};
    const role = currentUser?.role?.toLowerCase() || "";
    const isManagerial = ['admin', 'ceo', 'manager'].some(r => role.includes(r)) || currentUser?.id === 'admin' || currentUser?.emp_id === 'emp110';
    const empId = currentUser?.emp_id || 'unknown';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        fetchDashboardData();

        const reqChannel = supabase
            .channel('realtime-outside-reqs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'outside_requests' }, () => {
                fetchDashboardData();
            }).subscribe();

        return () => {
            clearInterval(timer);
            supabase.removeChannel(reqChannel);
        };
    }, []);

    useEffect(() => {
        if (todaysLog && todaysLog.time_in) {
            setWorkDuration(calculateActiveTime(todaysLog.time_in, todaysLog.time_out));
        } else {
            setWorkDuration('00h 00m 00s');
        }
    }, [currentTime, todaysLog]);

    const fetchDashboardData = async () => {
        try {
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-CA');
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
            
            const [geoRes, passRes] = await Promise.all([
                supabase.from('company_settings').select('*').eq('id', 1).maybeSingle(),
                supabase.from('outside_requests').select('status').eq('emp_id', empId).eq('date', todayStr).maybeSingle()
            ]);

            if (geoRes.data) setGeoConfig({ lat: geoRes.data.office_lat || 0, lng: geoRes.data.office_lng || 0, radius: geoRes.data.office_radius || 100 });
            if (passRes.data) setOutsideReqStatus(passRes.data.status); 

            const [empRes, activeRes, totalPresentRes, noticeRes, holidayRes] = await Promise.all([
                supabase.from('employees').select('*', { count: 'exact', head: true }),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr).is('time_out', null),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', todayStr),
                supabase.from('notices').select('*').order('date', { ascending: false }).limit(2),
                supabase.from('holidays').select('*').gte('date', todayStr).limit(3)
            ]);

            setStats({ total: empRes.count || 0, activeNow: activeRes.count || 0, absent: Math.max(0, (empRes.count || 0) - (totalPresentRes.count || 0)), leaves: 0 });

            if (!isManagerial) {
                const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('emp_id', empId).gte('date', firstDay);
                setMonthlyCount(count || 0);
            }

            const { data: myAtt } = await supabase.from('attendance').select('*').eq('emp_id', empId).eq('date', todayStr).maybeSingle();
            setTodaysLog(myAtt || null);
            setNotices(noticeRes.data || []);
            setHolidays(holidayRes.data || []);

        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // 🚀 মেইন অফিস ডিউটি চেক (শুধুমাত্র জিপিএস ভেরিফাই করবে)
    const handleOfficeDutyCheck = async (action) => {
        setVerifyingGeo(true);
        try {
            const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            const lat = coordinates.coords.latitude;
            const lng = coordinates.coords.longitude;
            const distance = getDistance(lat, lng, geoConfig.lat, geoConfig.lng);
            const allowedRadius = geoConfig.radius || 150; 
            
            if (distance <= allowedRadius) {
                executeBiometricAuth(action, lat, lng, null, null);
            } else {
                Swal.fire({ title: 'Too Far!', text: `You are ${Math.round(distance)}m away from the office! Please use 'Outside Check-in' and mention the reason.`, icon: 'error', confirmButtonColor: '#0f172a' });
            }
        } catch (err) { Swal.fire({ title: 'GPS Error', text: 'Turn on GPS/Location to check in!', icon: 'error', confirmButtonColor: '#0f172a' }); }
        setVerifyingGeo(false);
    };

    // 🚀 আউটসাইড ডিউটি মডাল ওপেন
    const openOutsideModal = (action) => {
        setCurrentAction(action);
        setOutDescription('');
        setPhotoFile(null);
        setShowPhotoModal(true);
    };

    const handleRemoteCheckinWithPhoto = async (e) => {
        e.preventDefault();
        if (currentAction === 'clock_in' && !photoFile) return Swal.fire('Error', 'A live photo is required for Outside Check-in!', 'error');
        if (!outDescription && outsideReqStatus !== 'Approved') return Swal.fire('Error', 'Please describe your reason for outside check-in/out.', 'error');
        
        setUploading(true);
        let uploadedPhotoUrl = null;

        try {
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `remote_${empId}_${currentAction}_${Date.now()}.${fileExt}`;
                await supabase.storage.from('attendance_docs').upload(fileName, photoFile);
                const { data } = supabase.storage.from('attendance_docs').getPublicUrl(fileName);
                uploadedPhotoUrl = data.publicUrl;
            }
            
            setShowPhotoModal(false); 
            executeBiometricAuth(currentAction, null, null, uploadedPhotoUrl, outDescription);
        } catch (err) { Swal.fire('Error', 'Error uploading photo. Try again.', 'error'); }
        setUploading(false);
    };

    // 🚀 স্মার্ট বায়োমেট্রিক সিস্টেম
    const executeBiometricAuth = async (action, lat = null, lng = null, photoUrl = null, description = null) => {
        try {
            let isAuthenticated = false;

            if (Capacitor.isNativePlatform()) {
                const available = await NativeBiometric.isAvailable();
                if (!available.isAvailable) return Swal.fire('Security Alert', 'Please setup screen lock or fingerprint on your phone first.', 'warning');
                
                await NativeBiometric.verifyIdentity({ reason: "Authenticate to record attendance", title: "LAMS Security" }).then(() => {
                    isAuthenticated = true;
                }).catch(() => { isAuthenticated = false; });
            } else {
                if (!window.PublicKeyCredential) return Swal.fire('Error', 'Biometric not supported on this device/browser.', 'error');
                const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
                const credential = await navigator.credentials.create({ publicKey: { challenge, rp: { name: "LAMS" }, user: { id: Uint8Array.from(empId, c => c.charCodeAt(0)), name: currentUser.name, displayName: currentUser.name }, pubKeyCredParams: [{ alg: -7, type: "public-key" }], authenticatorSelection: { authenticatorAttachment: "platform" }, timeout: 60000 } });
                if (credential) isAuthenticated = true;
            }

            if (isAuthenticated) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-CA');
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                
                if (action === 'clock_in') {
                    let insertData = { emp_id: empId, name: currentUser.name, date: dateStr, time_in: timeStr, latitude: lat, longitude: lng };
                    if (photoUrl) insertData.checkin_photo = photoUrl;
                    if (description) insertData.out_description = description;
                    await supabase.from('attendance').insert([insertData]);
                } else {
                    let updateData = { time_out: timeStr };
                    if (lat && lng) { updateData.latitude = lat; updateData.longitude = lng; }
                    if (description) {
                        updateData.out_description = todaysLog.out_description ? `${todaysLog.out_description} | Check-out: ${description}` : `Check-out: ${description}`;
                    }
                    await supabase.from('attendance').update(updateData).eq('emp_id', empId).eq('date', dateStr);
                }
                fetchDashboardData();
                Swal.fire({ title: 'Success!', text: `Successfully ${action === 'clock_in' ? 'Checked-in' : 'Checked-out'}! ✅`, icon: 'success', confirmButtonColor: '#0f172a' });
            }
        } catch (err) { Swal.fire('Canceled', 'Authentication Failed or Canceled!', 'error'); }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
                <div className="relative flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
                    <div className="absolute text-slate-950 text-xl animate-pulse"><i className="fa-solid fa-bolt"></i></div>
                </div>
                <h2 className="mt-6 text-xs font-black text-slate-900 tracking-[0.5em] uppercase italic animate-pulse">Lams Power</h2>
            </div>
        );
    }

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
                {isManagerial ? (
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
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic">Security Access</p>
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Duty Control</h2>
                            {todaysLog && (
                                <div className="mt-4 flex items-center gap-3 bg-white/10 w-max px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                                    <i className={`fa-solid fa-clock ${!todaysLog.time_out ? 'text-green-400 animate-pulse' : 'text-slate-400'}`}></i>
                                    <span className="font-mono text-lg font-black tracking-widest text-white">{workDuration}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{!todaysLog.time_out ? 'Active Now' : 'Total Logged'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-auto relative z-10 flex flex-col gap-3 mt-6 md:mt-0">
                    {/* 🚀 চেক-ইন অপশনস */}
                    {!todaysLog && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => handleOfficeDutyCheck('clock_in')} disabled={verifyingGeo} className="w-full sm:w-64 py-5 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                                {verifyingGeo ? 'Checking...' : 'Verify & Check-in (Office)'}
                            </button>
                            <button onClick={() => openOutsideModal('clock_in')} className="w-full sm:w-64 py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                                Outside Check-in
                            </button>
                        </div>
                    )}

                    {/* 🚀 চেক-আউট অপশনস */}
                    {todaysLog && !todaysLog.time_out && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => handleOfficeDutyCheck('clock_out')} disabled={verifyingGeo} className="w-full sm:w-64 py-5 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                                {verifyingGeo ? 'Checking...' : 'Verify & Check-out (Office)'}
                            </button>
                            <button onClick={() => openOutsideModal('clock_out')} className="w-full sm:w-64 py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                                Outside Check-out
                            </button>
                        </div>
                    )}

                    {todaysLog?.time_out && (
                        <div className="w-full sm:w-[32.5rem] py-5 bg-white/5 border border-white/10 text-white/30 rounded-2xl font-black text-[10px] uppercase text-center tracking-widest italic">Duty Completed</div>
                    )}
                    
                    {outsideReqStatus && !todaysLog?.time_out && (
                        <div className="text-[10px] font-bold text-center mt-2 px-4 py-2 rounded-xl bg-white/10 text-white tracking-widest uppercase">
                            Admin Status: <span className={outsideReqStatus === 'Approved' ? 'text-green-400' : 'text-orange-400'}>{outsideReqStatus}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <BoardCard title="Notice Board" icon="fa-bullhorn" color="text-orange-500" items={notices} type="notice" />
                <BoardCard title="Upcoming Holidays" icon="fa-calendar-star" color="text-blue-500" items={holidays} type="holiday" />
            </div>

            {/* 🚀 আউটসাইড ডিউটি মডাল (রিজনসহ) */}
            {showPhotoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 relative animate-[fadeIn_0.3s_ease-out]">
                        <button onClick={() => setShowPhotoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
                        <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase">Remote Duty Verification</h3>
                        <p className="text-xs font-bold text-slate-500 text-center mb-6">Complete the steps below to verify your location.</p>
                        <form onSubmit={handleRemoteCheckinWithPhoto} className="space-y-4">
                            {currentAction === 'clock_in' && (
                                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">1. Live Photo Evidence</label>
                                    <input type="file" accept="image/*" capture="user" onChange={e => setPhotoFile(e.target.files[0])} required className="text-xs font-bold text-slate-600 w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white cursor-pointer" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">2. Reason / Description</label>
                                <textarea 
                                    value={outDescription} 
                                    onChange={e => setOutDescription(e.target.value)} 
                                    required={outsideReqStatus !== 'Approved'}
                                    placeholder={outsideReqStatus === 'Approved' ? "Optional: Add any remarks..." : "Required: Why are you checking in/out from outside?"}
                                    className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold text-sm outline-none" rows="3"
                                ></textarea>
                            </div>
                            <button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:bg-slate-400 mt-2">
                                {uploading ? 'Processing...' : 'Verify & Authenticate'}
                            </button>
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