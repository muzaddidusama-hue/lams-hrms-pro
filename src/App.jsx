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
import Notices from './Notices';

export default function App() {
  // বুলেটপ্রুফ স্টেট: পেজ লোড হওয়ার আগেই চেক করবে ডাটা আসল নাকি নষ্ট
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lams_user');
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      
      // আপনার ডাটাবেজ স্ট্রাকচার অনুযায়ী ভ্যালিডেশন
      if (!parsed.emp_id && !parsed.id) {
        console.warn("নষ্ট ডাটা পাওয়া গেছে, ডিলিট করা হলো!");
        localStorage.removeItem('lams_user');
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

  // সব ঠিক থাকলে ড্যাশবোর্ড এবং অন্যান্য পেজ
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
          
          {/* ১. ড্যাশবোর্ড - প্রিমিয়াম মিনিমাল লুকের জন্য */}
          <Route index element={<Dashboard user={user} />} />
          
          {/* ২. টিম - শুধু এডমিনরা এক্সেস করবে */}
          <Route path="team" element={<Team user={user} />} />
          
          {/* ৩. প্রোফাইল - ডাটা আপডেট করার জন্য */}
          <Route path="profile" element={<Profile user={user} onProfileUpdate={setUser} />} />
          
          {/* ৪. পেরোল - স্যালারি শিট ডাউনলোডের জন্য */}
          <Route path="payroll" element={<Payroll user={user} />} />
          
          {/* ৫. লিভ - ছুটির আবেদনের জন্য */}
          <Route path="leaves" element={<Leaves user={user} />} />
          
          {/* 🛠️ ফিক্সড: এটেনডেন্স লগ - এখন আর ফাঁকা আসবে না */}
          <Route path="attendance" element={<Attendance user={user} />} />
          
          {/* ৬. নোটিশবোর্ড */}
          <Route path="notices" element={<Notices user={user} />} />
          
          {/* 🛠️ ফিক্সড: হলিডে - রেঞ্জ সিলেক্ট এবং পারমিশন চেক করার জন্য */}
          <Route path="holidays" element={<Holidays user={user} />} />

          {/* ৪-০-৪ পেজ */}
          <Route path="*" element={
            <div className="text-center p-20 animate-[fadeIn_0.4s_ease-out]">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold text-slate-700 uppercase tracking-tighter">Under Construction</h2>
              <p className="text-slate-400 mt-2 font-medium">এই পেজটিতে কাজ চলছে...</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
