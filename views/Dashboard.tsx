'use client';

import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [dbStats, setDbStats] = useState({ userCount: 0, branchCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.userCount !== undefined) {
        setDbStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
    setLoading(false);
  };

  const stats = [
    { label: 'Total Users', value: loading ? '...' : dbStats.userCount.toString(), change: 'Real-time', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'indigo' },
    { label: 'Total Branches', value: loading ? '...' : dbStats.branchCount.toString(), change: 'Real-time', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'rose' },
    { label: 'Attendance Rate', value: '98.5%', change: '+0.5%', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'emerald' },
    { label: 'Avg Performance', value: '4.8', change: 'Stable', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', color: 'amber' },
  ];

  const recentActivity = [
    { id: 1, user: 'Sarah Jenkins', action: 'applied for Leave', time: '2 hours ago', status: 'Pending' },
    { id: 2, user: 'Mike Ross', action: 'clocked in late', time: '3 hours ago', status: 'Flagged' },
    { id: 3, user: 'Admin Rob', action: 'updated Role: HR Manager', time: '5 hours ago', status: 'System' },
    { id: 4, user: 'Jessica Pearson', action: 'completed Onboarding', time: '1 day ago', status: 'Success' },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{user?.username || 'Admin'}!</span>
          </h1>
          <p className="text-slate-500 font-medium">Here's what's happening with your workforce today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            Export Report
          </button>
          <button className="px-4 py-2.5 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 transition-all shadow-md active:scale-95">
            Create New User
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform duration-300`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} />
                </svg>
              </div>
              <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' :
                stat.change.startsWith('-') ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                }`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-bold mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
            <button className="text-indigo-600 text-sm font-bold hover:underline underline-offset-4">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                  {activity.user.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 font-bold">
                    {activity.user} <span className="text-slate-500 font-medium">{activity.action}</span>
                  </p>
                  <p className="text-xs text-slate-400 font-medium tracking-tight">{activity.time}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${activity.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                  activity.status === 'Flagged' ? 'bg-rose-50 text-rose-600' :
                    activity.status === 'Success' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                  }`}>
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Shortcuts */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <h2 className="text-2xl font-black text-white mb-2 leading-tight">System<br />Health Check</h2>
            <p className="text-indigo-100 text-sm font-medium mb-6 opacity-80">All modules are operating within normal parameters.</p>
            <div className="flex items-center gap-2 text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Operational
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Quick Shortcuts</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all gap-2 border border-transparent hover:border-indigo-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="text-xs font-bold">New Hires</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all gap-2 border border-transparent hover:border-rose-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="text-xs font-bold">Announce</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-all gap-2 border border-transparent hover:border-amber-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-bold">Schedule</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all gap-2 border border-transparent hover:border-emerald-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span className="text-xs font-bold">Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
