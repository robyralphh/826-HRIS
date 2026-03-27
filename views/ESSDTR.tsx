'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AttendanceRecord {
    id: string;
    employeeId: string;
    date: string;
    timeIn: string | null;
    timeOut: string | null;
    status: string;
}

export default function ESSDTR() {
    const router = useRouter();
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);

    // Testing Override Form State
    const [showManualOverride, setShowManualOverride] = useState(false);
    const [overrideDate, setOverrideDate] = useState('');
    const [overrideTime, setOverrideTime] = useState('');
    const [overrideAction, setOverrideAction] = useState('ClockIn');
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        fetchLogs();
        
        const today = new Date().toISOString().split('T')[0];
        setOverrideDate(today);

        return () => clearInterval(timer);
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/ess/my-attendance', {
                headers: { 'x-admin-id': adminId }
            });
            if (res.ok) {
                setAttendanceLogs(await res.json());
            } else {
                console.error("Failed to fetch DTR logs");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClockAction = async (type: 'ClockIn' | 'ClockOut', useOverride: boolean = false) => {
        setIsClocking(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            
            const payload: any = { type };
            if (useOverride) {
                if (overrideDate) payload.overrideDate = overrideDate;
                if (overrideTime) payload.overrideTime = overrideTime;
            }

            const res = await fetch('/api/ess/my-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchLogs();
                if (useOverride) {
                    setOverrideTime('');
                    setShowManualOverride(false);
                }
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to record time log.');
            }
        } catch(error) {
            console.error(error);
        } finally {
            setIsClocking(false);
        }
    };

    const hasActiveClockIn = attendanceLogs.length > 0 && attendanceLogs[0].timeOut === null;

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const calculateDuration = (timeIn: string | null, timeOut: string | null, isLive: boolean = false) => {
        if (!timeIn) return { formatted: '--', rawHours: 0 };
        const start = new Date(timeIn).getTime();
        const end = timeOut ? new Date(timeOut).getTime() : (isLive && currentTime ? currentTime.getTime() : start);
        
        let diffMs = end - start;
        if (diffMs < 0) diffMs = 0;
        
        const rawHours = diffMs / (1000 * 60 * 60);
        const hrs = Math.floor(rawHours);
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            formatted: `${hrs}h ${mins}m`,
            rawHours
        };
    };

    const getExcessHours = (rawHours: number) => {
        if (rawHours <= 8) return '--';
        const excess = rawHours - 8;
        const hrs = Math.floor(excess);
        const mins = Math.floor((excess * 60) % 60);
        return `+${hrs}h ${mins}m`;
    };

    const filteredLogs = attendanceLogs.filter(log => {
        const logDateObj = new Date(log.date);
        logDateObj.setHours(0,0,0,0);
        
        if (startDate) {
            const startObj = new Date(`${startDate}T00:00:00`);
            if (logDateObj < startObj) return false;
        }
        if (endDate) {
            const endObj = new Date(`${endDate}T00:00:00`);
            if (logDateObj > endObj) return false;
        }
        return true;
    });

    const handleExportCSV = () => {
        const headers = ['Date', 'Clock In', 'Clock Out', 'Duration', 'Excess Hrs', 'Status'];
        const csvRows = [headers.join(',')];
        
        filteredLogs.forEach(log => {
            const isLive = log.timeOut === null;
            const durationObj = calculateDuration(log.timeIn, log.timeOut, isLive);
            const excessStr = getExcessHours(durationObj.rawHours);
            
            const row = [
                new Date(log.date).toLocaleDateString(),
                formatTime(log.timeIn),
                formatTime(log.timeOut),
                durationObj.formatted,
                excessStr,
                log.status
            ];
            csvRows.push(row.join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `My_DTR_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let html = `
            <html>
            <head>
                <title>My DTR Report</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    h2 { margin-bottom: 5px; }
                    .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f8fafc; color: #475569; text-transform: uppercase; font-size: 10px; font-weight: bold; }
                    .center { text-align: center; }
                </style>
            </head>
            <body>
                <h2>My Daily Time Record</h2>
                <div class="meta">Generated on: ${new Date().toLocaleString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th class="center">Date</th>
                            <th class="center">Clock In</th>
                            <th class="center">Clock Out</th>
                            <th class="center">Duration</th>
                            <th class="center">Excess Hrs</th>
                            <th class="center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredLogs.forEach(log => {
            const isLive = log.timeOut === null;
            const durationObj = calculateDuration(log.timeIn, log.timeOut, isLive);
            const excessStr = getExcessHours(durationObj.rawHours);

            html += `
                <tr>
                    <td class="center">${new Date(log.date).toLocaleDateString()}</td>
                    <td class="center">${formatTime(log.timeIn)}</td>
                    <td class="center">${formatTime(log.timeOut)}</td>
                    <td class="center">${durationObj.formatted}</td>
                    <td class="center">${excessStr}</td>
                    <td class="center">${log.status}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="p-8 h-screen overflow-hidden flex flex-col bg-slate-50 font-sans">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <button onClick={() => router.push('/ess/dashboard')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to MyESS
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Daily Time Record</h1>
                    <p className="text-gray-500 mt-1">Clock in and out of your shift and view historical accuracy.</p>
                </div>
                
                {currentTime && (
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                            <div className="text-3xl font-black text-indigo-950 tracking-tighter">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                        <div className="flex items-center bg-white rounded-xl ring-1 ring-slate-200 shadow-sm px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition-all overflow-hidden mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">From</span>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-slate-800 text-[11px] font-bold py-2 outline-none cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-slate-300 mx-2 uppercase tracking-widest">To</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-slate-800 text-[11px] font-bold py-2 outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                {/* Clock Actions Panel */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center relative overflow-hidden h-64">
                        <div className={`absolute inset-0 bg-gradient-to-b ${hasActiveClockIn ? 'from-amber-500/10 to-transparent' : 'from-indigo-600/10 to-transparent'} opacity-50`}></div>
                        
                        <div className="relative z-10 w-full text-center">
                            {hasActiveClockIn ? (
                                <>
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">Shift In Progress</h3>
                                    <p className="text-sm text-slate-500 mb-2">You clocked in at {formatTime(attendanceLogs[0].timeIn)}</p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 border border-amber-200/50 rounded-lg text-amber-700 font-black tracking-widest text-xs mb-6 shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                        {calculateDuration(attendanceLogs[0].timeIn, null, true).formatted}
                                    </div>
                                    <button 
                                        onClick={() => handleClockAction('ClockOut')}
                                        disabled={isClocking}
                                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-white font-black text-lg rounded-2xl shadow-sm transition-all focus:ring-4 focus:ring-amber-500/20 disabled:opacity-50"
                                    >   
                                        {isClocking ? 'Processing...' : 'Clock Out'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">Ready to Start</h3>
                                    <p className="text-sm text-slate-500 mb-6">Log your attendance for today's shift.</p>
                                    <button 
                                        onClick={() => handleClockAction('ClockIn')}
                                        disabled={isClocking}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-indigo-500/30 transition-all focus:ring-4 focus:ring-indigo-600/20 disabled:opacity-50"
                                    >   
                                        {isClocking ? 'Processing...' : 'Clock In Now'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Manual Override for Testing */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        <button 
                            onClick={() => setShowManualOverride(!showManualOverride)} 
                            className="w-full p-4 flex items-center justify-between bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Testing Override Panel
                            </div>
                            <svg className={`w-5 h-5 transition-transform ${showManualOverride ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {showManualOverride && (
                            <div className="p-4 bg-white border-t border-slate-100">
                                <p className="text-xs font-medium text-amber-600 bg-amber-50 p-3 rounded-xl mb-4 leading-relaxed">
                                    Simulate biometric logs by manually inserting a record at a specific time and date.
                                </p>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Target Date</label>
                                            <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Target Time</label>
                                            <input type="time" value={overrideTime} onChange={(e) => setOverrideTime(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Action</label>
                                        <select value={overrideAction} onChange={(e) => setOverrideAction(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="ClockIn">Clock In</option>
                                            <option value="ClockOut">Clock Out</option>
                                            <option value="Absent">Absent</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={() => handleClockAction(overrideAction as any, true)}
                                        disabled={isClocking || (overrideAction === 'ClockIn' && !overrideTime)}
                                        className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        Force Submit Log
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Historical Log Panel */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Activity Log</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print
                            </button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export CSV
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Clock In</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Clock Out</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Duration</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Excess Hrs</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 border-t border-gray-100/50">
                                    {filteredLogs.map(log => {
                                        const durationObj = calculateDuration(log.timeIn, log.timeOut, log.timeOut === null);
                                        const excessStr = getExcessHours(durationObj.rawHours);
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/50 rounded-lg text-indigo-700 font-bold text-sm">
                                                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                        {formatTime(log.timeIn)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {log.timeOut ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/50 rounded-lg text-amber-700 font-bold text-sm">
                                                            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4-4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                            {formatTime(log.timeOut)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 font-bold text-sm">--:--</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-slate-600 font-bold text-sm">{durationObj.formatted}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-sm font-black tracking-wide ${excessStr !== '--' ? 'text-indigo-600' : 'text-slate-300'}`}>{excessStr}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col gap-1 items-end">
                                                        {log.status.split(', ').map((stat, idx) => (
                                                            <span key={idx} className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${
                                                                stat === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                                stat === 'Late' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                stat === 'Undertime' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                stat === 'Absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                stat === 'Rest Day' || stat === 'Day Off' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                                                'bg-slate-100 text-slate-500 border-slate-200'
                                                            }`}>
                                                                {stat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {attendanceLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">No DTR logs found for this period.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
