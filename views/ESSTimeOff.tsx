'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ESSTimeOffView() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'intra' | 'leaves'>('intra');
    
    // Intra-Day State (OT/UT)
    const [timeRequests, setTimeRequests] = useState<any[]>([]);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [requestType, setRequestType] = useState('Overtime');
    const [requestDate, setRequestDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    
    // Leave State (PTO/Sick)
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leaveType, setLeaveType] = useState('Leave (PTO)');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        fetchRequests();
        const today = new Date().toISOString().split('T')[0];
        setRequestDate(today);
        setStartDate(today);
        setEndDate(today);
    }, [router]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            const adminId = userStr ? JSON.parse(userStr).id : '';

            const [timeRes, leaveRes] = await Promise.all([
                fetch('/api/ess/my-time-requests', { headers: { 'x-admin-id': adminId } }),
                fetch('/api/ess/my-leave-requests', { headers: { 'x-admin-id': adminId } })
            ]);
            
            if (timeRes.ok) {
                const timeData = await timeRes.json();
                setTimeRequests(timeData.requests || []);
            }
            if (leaveRes.ok) {
                const leaveData = await leaveRes.json();
                setLeaveRequests(leaveData.requests || []);
            }
        } catch (error) {
            console.error('Failed to fetch requests', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTimeRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/ess/my-time-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify({ type: requestType, date: requestDate, startTime, endTime, reason })
            });
            if (res.ok) {
                setIsTimeModalOpen(false);
                resetForms();
                fetchRequests();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to file request');
            }
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const handleCreateLeaveRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/ess/my-leave-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify({ type: leaveType, startDate, endDate, reason })
            });
            if (res.ok) {
                setIsLeaveModalOpen(false);
                resetForms();
                fetchRequests();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to file request');
            }
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const resetForms = () => {
        setRequestType('Overtime');
        setLeaveType('Leave (PTO)');
        const today = new Date().toISOString().split('T')[0];
        setRequestDate(today); setStartDate(today); setEndDate(today);
        setStartTime(''); setEndTime(''); setReason('');
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return '';
        const startDate = new Date(`1970-01-01T${start}:00`);
        const endDate = new Date(`1970-01-01T${end}:00`);
        const diffMs = endDate.getTime() - startDate.getTime();
        if (diffMs < 0) return formatDurationString((new Date(`1970-01-02T${end}:00`).getTime()) - startDate.getTime());
        return formatDurationString(diffMs);
    };

    const formatDurationString = (diffMs: number) => {
        if (diffMs === 0) return '0m';
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        if (diffHrs === 0) return `${diffMins}m`;
        if (diffMins === 0) return `${diffHrs}h`;
        return `${diffHrs}h ${diffMins}m`;
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-pink-100 text-pink-700 border-pink-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; 
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/ess/dashboard')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-gray-900">Time Off & Attendance</h1>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">ESS Module</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
                {/* Balances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <h3 className="text-4xl font-black text-slate-800 mb-1 relative z-10">48<span className="text-lg text-slate-400 font-bold ml-1">hrs</span></h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10">Remaining PTO</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <h3 className="text-4xl font-black text-slate-800 mb-1 relative z-10">24<span className="text-lg text-slate-400 font-bold ml-1">hrs</span></h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10">Sick Leave</p>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('intra')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'intra' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Intra-Day (OT/UT)</button>
                            <button onClick={() => setActiveTab('leaves')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'leaves' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Leaves (PTO/Sick)</button>
                        </div>
                        <button 
                            onClick={() => activeTab === 'intra' ? setIsTimeModalOpen(true) : setIsLeaveModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors mr-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            File {activeTab === 'intra' ? 'Time Request' : 'Leave'}
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto min-h-[300px]">
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        ) : activeTab === 'intra' ? (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Type</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {timeRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4"><div className="font-bold text-gray-900">{new Date(req.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>
                                            <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${req.type === 'Overtime' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>{req.type}</span></td>
                                            <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500">{req.startTime} - {req.endTime}</span><span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">{calculateDuration(req.startTime, req.endTime)}</span></div></td>
                                            <td className="px-6 py-4"><div className="max-w-[200px] truncate text-sm text-gray-600" title={req.reason || ''}>{req.reason || '-'}</div></td>
                                            <td className="px-6 py-4 text-right"><span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border inline-block ${getStatusStyle(req.status)}`}>{req.status}</span></td>
                                        </tr>
                                    ))}
                                    {timeRequests.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No time requests found.</td></tr>}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Start</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">End</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Type</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {leaveRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4"><div className="font-bold text-gray-900">{new Date(req.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>
                                            <td className="px-6 py-4"><div className="font-bold text-gray-900">{new Date(req.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>
                                            <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${req.type === 'Leave (PTO)' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{req.type}</span></td>
                                            <td className="px-6 py-4"><div className="max-w-[200px] truncate text-sm text-gray-600" title={req.reason || ''}>{req.reason || '-'}</div></td>
                                            <td className="px-6 py-4 text-right"><span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border inline-block ${getStatusStyle(req.status)}`}>{req.status}</span></td>
                                        </tr>
                                    ))}
                                    {leaveRequests.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No leave requests found.</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Create Intra-Day Modal */}
            {isTimeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Request OT/UT</h3>
                            <button onClick={() => setIsTimeModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleCreateTimeRequest} className="p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                        <select required value={requestType} onChange={e => setRequestType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Overtime">Overtime</option><option value="Undertime">Undertime</option></select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                                        <input required type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Time</label>
                                        <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Time</label>
                                        <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</label><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea></div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3"><button type="button" onClick={() => setIsTimeModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl">Cancel</button><button disabled={isSaving} type="submit" className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">{isSaving ? 'Submitting...' : 'Submit Request'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Leave Modal */}
            {isLeaveModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Request Leave</h3>
                            <button onClick={() => setIsLeaveModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleCreateLeaveRequest} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                    <select required value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Leave (PTO)">Leave (PTO)</option><option value="Sick Leave">Sick Leave</option></select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                                        <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                                        <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</label><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea></div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3"><button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl">Cancel</button><button disabled={isSaving} type="submit" className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">{isSaving ? 'Submitting...' : 'Submit Request'}</button></div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

