'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ESSDashboardPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUserRole(userData.role);
            setUserName(userData.username || 'Employee');
        } else {
            router.push('/login');
        }
    }, [router]);

    if (!userRole) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="font-sans">
            <main className="p-8 max-w-7xl mx-auto w-full">
                <div className="mb-8">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Good day, {userName}!</h2>
                    <p className="text-gray-500 mt-2 text-lg">Manage your personal workflows, benefits, and career growth.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Financial & Compensation */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Pay & Taxes</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 relative z-10">View digital paystubs, W-2s, and manage direct deposits.</p>
                        <ul className="space-y-2 relative z-10">
                            <li className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>Recent Paystub</li>
                            <li className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>Tax Documents</li>
                        </ul>
                    </div>

                    {/* Benefits & Wellness */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-100 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Benefits</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 relative z-10">Manage enrollment, view coverage summaries, and retirement.</p>
                        <ul className="space-y-2 relative z-10">
                            <li className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Health Insurance</li>
                            <li className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>401k Dashboard</li>
                        </ul>
                    </div>

                    {/* Time & Attendance */}
                    <div onClick={() => router.push('/ess/time-off')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-sky-100 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Time Off</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 relative z-10">Request leave, track timesheets, and view the holiday calendar.</p>
                        <ul className="space-y-2 relative z-10">
                            <li className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>Request PTO</li>
                            <li className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>Timesheets</li>
                        </ul>
                    </div>

                    {/* Growth & Career */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-rose-100 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Career</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 relative z-10">Performance reviews, goal tracking, and learning modules.</p>
                        <ul className="space-y-2 relative z-10">
                            <li className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>My OKRs</li>
                            <li className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>Learning Hub</li>
                        </ul>
                    </div>
                    {/* Daily Time Record */}
                    <div onClick={() => router.push('/ess/dtr')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-violet-100 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">DTR</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 relative z-10">Clock In and Out of your shift.</p>
                        <ul className="space-y-2 relative z-10">
                            <li className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>Time Clock</li>
                        </ul>
                    </div>

                    {/* Expenses & Reimbursements */}
                    <div onClick={() => router.push('/ess/expenses')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-100 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Expenses</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 relative z-10">File new reimbursement requests and track claim status.</p>
                        <ul className="space-y-2 relative z-10">
                            <li className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>New Claim</li>
                            <li className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>History</li>
                        </ul>
                    </div>

                </div>

                {/* AI Predictive Insights Placeholder */}
                <div className="mt-8 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl shadow-lg border border-slate-800 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <span className="text-indigo-400 text-sm font-black">AI</span>
                            </div>
                            <h3 className="text-white font-bold text-xl">Predictive Insights</h3>
                        </div>
                        <p className="text-indigo-200 text-sm font-medium leading-relaxed">
                            Based on your recent timesheets, you are approaching <strong className="text-white">150 consecutive hours</strong> worked over the last 3 weeks.
                            We recommend taking advantage of your 48 remaining PTO hours to prevent burnout.
                        </p>
                    </div>
                    <div className="relative z-10 shrink-0 hidden md:block pl-6">
                        <button className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                            Schedule PTO
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
