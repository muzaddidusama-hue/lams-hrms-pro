import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Layout from './Layout'
import Dashboard from './Dashboard'
import Team from './Team'
import Profile from './Profile'
import Payroll from './Payroll'
import Leaves from './Leaves'
import Holidays from './Holidays'
import Attendance from './Attendance'

export default function App() {
  // বুলেটপ্রুফ স্টেট: পেজ লোড হওয়ার আগেই চেক করবে ডাটা আসল নাকি নষ্ট
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lams_user');
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      
      // চেক করছি ডাটায় আমাদের বানানো 'salary' বা 'id' আছে কিনা
      if (parsed.salary === undefined || !parsed.id) {
        console.warn("নষ্ট ডাটা পাওয়া গেছে, ডিলিট করা হলো!");
        localStorage.removeItem('lams_user'); // নষ্ট ডাটা ডিলিট
        return null;
      }
      return parsed;
    } catch (e) {
      localStorage.removeItem('lams_user');
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('lams_user');
    setUser(null);
  };

  // ইউজার না থাকলে লগইন পেজ
  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />
  }

  // সব ঠিক থাকলে ড্যাশবোর্ড
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
          <Route index element={<Dashboard user={user} />} />
          <Route path="team" element={<Team />} />
          <Route path="profile" element={<Profile user={user} onProfileUpdate={setUser} />} />
          <Route path="payroll" element={<Payroll user={user} />} />
          <Route path="leaves" element={<Leaves user={user} />} />
          <Route path="attendance" element={<Attendance />} />
<Route path="notices" element={<Notices user={user} />} />
<Route path="holidays" element={<Holidays />} />
          <Route path="*" element={
            <div className="text-center p-20 animate-[fadeIn_0.4s_ease-out]">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold text-slate-700">Under Construction</h2>
              <p className="text-slate-400 mt-2">এই পেজটিতে কাজ চলছে...</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
