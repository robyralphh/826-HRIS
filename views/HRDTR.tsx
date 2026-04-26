'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calcLateDeduction, WorkFactor } from '@/lib/lateDeduction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShiftDay {
    id: string;
    startTime: string | null;
    endTime: string | null;
    isFlexi: boolean;
    flexiHours: number | null;
}

interface EmployeeSchedule {
    monday:    ShiftDay | null;
    tuesday:   ShiftDay | null;
    wednesday: ShiftDay | null;
    thursday:  ShiftDay | null;
    friday:    ShiftDay | null;
    saturday:  ShiftDay | null;
    sunday:    ShiftDay | null;
}

interface EmployeeDTR {
    id: string;
    date: string;
    timeIn: string;
    timeOut: string | null;
    status: string;
    incidentReportUrl: string | null;
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        pictureUrl: string | null;
        baseSalary: number | null;
        salaryType: string | null;
        workFactor: number | null;
        gracePeriodMinutes?: number | null;
        employeeNo?: string | null;
        department: { name: string } | null;
        position: { name: string } | null;
        schedule: EmployeeSchedule | null;
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PH_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getShiftForDate(schedule: EmployeeSchedule | null, dateStr: string): ShiftDay | null {
    if (!schedule) return null;
    const d = new Date(dateStr);
    const dayName = PH_DAYS[d.getDay()] as keyof EmployeeSchedule;
    return schedule[dayName] ?? null;
}

function formatPHP(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HRDTR() {
    const router = useRouter();
    const [logs, setLogs] = useState<EmployeeDTR[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Late deduction settings
    const [workFactor, setWorkFactor] = useState<WorkFactor>(313);
    const [showSettings, setShowSettings] = useState(false);
    const lunchStart = '12:00';
    const lunchEnd   = '13:00';

    // Editing State
    const [editingLog, setEditingLog] = useState<EmployeeDTR | null>(null);
    const [editTimeInDate, setEditTimeInDate] = useState('');
    const [editTimeInTime, setEditTimeInTime] = useState('');
    const [editTimeOutDate, setEditTimeOutDate] = useState('');
    const [editTimeOutTime, setEditTimeOutTime] = useState('');
    const [editIncidentReportUrl, setEditIncidentReportUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Simulate real-time tracking for ongoing shifts
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
                const res = await fetch('/api/hr/attendance', {
                    headers: { 'x-admin-id': adminId }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                } else {
                    console.error('Failed to fetch HR DTR logs');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/hr/biometrics/sync', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                }
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Organization-Wide Sync Complete:\n${data.results.map((r: any) => `- ${r.deviceName} (${r.branchName}): ${r.error ? `Error: ${r.error}` : `Synced ${r.logsSynced} logs`}`).join('\n')}`);
                // Refresh logs
                const refreshRes = await fetch('/api/hr/attendance', {
                    headers: { 'x-admin-id': adminId }
                });
                if (refreshRes.ok) setLogs(await refreshRes.json());
            } else {
                alert(`Sync Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error syncing multi-branch biometrics:', error);
            alert('A network error occurred while syncing biometrics.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePurgeGhosts = async () => {
        if (!confirm('This will delete all attendance records with invalid dates (Year 2033, 2031, 2000, etc.) resulting from hardware malfunctions. Are you sure?')) return;
        
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/hr/attendance/purge', {
                method: 'DELETE',
                headers: { 'x-admin-id': adminId }
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to purge records.');
        }
    };

    // ── Late deduction calculation per row ────────────────────────────────
    function calcRowDeduction(log: EmployeeDTR) {
        if (!log.timeIn || log.status.includes('Absent')) return null;
        // Only for non-flexi employees with a fixed shift start
        const shift = getShiftForDate(log.employee.schedule, log.date);
        const shiftStart = shift?.startTime ?? '08:00';
        if (shift?.isFlexi) return null; // flexi employees don't have a fixed start

        const rawBase   = log.employee.baseSalary ?? 0;
        const salType   = (log.employee.salaryType ?? 'Monthly') as 'Monthly' | 'Daily' | 'Hourly';
        const empFactor = (log.employee.workFactor === 261 ? 261 : 313) as 313 | 261;

        // baseSalary is stored in the employee's own salary-type units; convert to
        // canonical monthly before passing to the deduction utility.
        let monthlyBasic: number;
        if (salType === 'Monthly') {
            monthlyBasic = rawBase;
        } else if (salType === 'Daily') {
            monthlyBasic = (rawBase * empFactor) / 12;
        } else {
            monthlyBasic = (rawBase * 8 * empFactor) / 12;
        }

        if (monthlyBasic <= 0) return null;

        return calcLateDeduction({
            monthlyBasic,
            workFactor,          // the UI-level toggle (313 or 261)
            shiftStart,
            lunchStart,
            lunchEnd,
            timeIn: log.timeIn,
            gracePeriodMinutes: log.employee.gracePeriodMinutes || 0,
        });
    }

    // ── Edit modal ────────────────────────────────────────────────────────
    const openEditModal = (log: EmployeeDTR) => {
        setEditingLog(log);
        
        const inDate = new Date(log.timeIn);
        setEditTimeInDate(inDate.toISOString().split('T')[0]);
        setEditTimeInTime(inDate.toTimeString().slice(0, 5));

        if (log.timeOut) {
            const outDate = new Date(log.timeOut);
            setEditTimeOutDate(outDate.toISOString().split('T')[0]);
            setEditTimeOutTime(outDate.toTimeString().slice(0, 5));
        } else {
            setEditTimeOutDate('');
            setEditTimeOutTime('');
        }
        setEditIncidentReportUrl('');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditIncidentReportUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingLog) return;
        setIsSaving(true);
        
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            
            const timeInStr = `${editTimeInDate}T${editTimeInTime}:00`;
            let timeOutStr = null;
            if (editTimeOutDate && editTimeOutTime) {
                timeOutStr = `${editTimeOutDate}T${editTimeOutTime}:00`;
            }

            const res = await fetch(`/api/hr/attendance/${editingLog.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId 
                },
                body: JSON.stringify({
                    timeIn: timeInStr,
                    timeOut: timeOutStr,
                    incidentReportUrl: editIncidentReportUrl
                })
            });
            
            if (res.ok) {
                const updatedLog = await res.json();
                setLogs(logs.map(log => log.id === updatedLog.id ? {...log, timeIn: updatedLog.timeIn, timeOut: updatedLog.timeOut} : log));
                setEditingLog(null);
            } else {
                alert('Failed to update attendance record.');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Formatters ────────────────────────────────────────────────────────
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
        
        return { formatted: `${hrs}h ${mins}m`, rawHours };
    };

    const getExcessHours = (rawHours: number) => {
        if (rawHours <= 8) return '--';
        const excess = rawHours - 8;
        const hrs = Math.floor(excess);
        const mins = Math.floor((excess * 60) % 60);
        return `+${hrs}h ${mins}m`;
    };

    // ── Filter ────────────────────────────────────────────────────────────
    const filteredLogs = logs.filter(log => {
        const query = searchTerm.toLowerCase();
        let matchesSearch = 
            `${log.employee.firstName} ${log.employee.lastName}`.toLowerCase().includes(query) ||
            log.employee.id.toLowerCase().includes(query);
        if (log.employee.department?.name && log.employee.department.name.toLowerCase().includes(query)) {
            matchesSearch = true;
        }
        const logDateObj = new Date(log.date);
        logDateObj.setHours(0,0,0,0);
        let matchesDate = true;
        if (startDate) {
            const startObj = new Date(`${startDate}T00:00:00`);
            if (logDateObj < startObj) matchesDate = false;
        }
        if (endDate) {
            const endObj = new Date(`${endDate}T00:00:00`);
            if (logDateObj > endObj) matchesDate = false;
        }
        return matchesSearch && matchesDate;
    });

    // ── Export CSV ────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        const headers = ['Employee ID', 'Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Excess Hrs', 'Status', 'Minutes Late', 'Deduction (PHP)'];
        const csvRows = [headers.join(',')];
        
        filteredLogs.forEach(log => {
            const isLive = log.timeOut === null;
            const durationObj = calculateDuration(log.timeIn, log.timeOut, isLive);
            const excessStr = getExcessHours(durationObj.rawHours);
            const deduction = calcRowDeduction(log);
            
            const row = [
                log.employee.id,
                `"${log.employee.firstName} ${log.employee.lastName}"`,
                `"${log.employee.department?.name || 'Unassigned'}"`,
                new Date(log.date).toLocaleDateString(),
                formatTime(log.timeIn),
                formatTime(log.timeOut),
                durationObj.formatted,
                excessStr,
                log.status,
                deduction ? deduction.totalMinutesLate : '',
                deduction ? deduction.deductionAmount.toFixed(2) : '',
            ];
            csvRows.push(row.join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HR_DTR_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Print ─────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let html = `
            <html>
            <head>
                <title>Organization DTR Report</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    h2 { margin-bottom: 5px; }
                    .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #ddd; padding: 7px; text-align: left; }
                    th { background-color: #f8fafc; color: #475569; text-transform: uppercase; font-size: 9px; font-weight: bold; }
                    .center { text-align: center; }
                    .tardy { color: #dc2626; font-weight: bold; }
                    .ontime { color: #16a34a; }
                </style>
            </head>
            <body>
                <h2>Organization DTR Report</h2>
                <div class="meta">Generated on: ${new Date().toLocaleString()} | Work Factor: ${workFactor}-day (${workFactor === 313 ? 'Mon–Sat' : 'Mon–Fri'})</div>
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th class="center">Date</th>
                            <th class="center">Clock In</th>
                            <th class="center">Clock Out</th>
                            <th class="center">Duration</th>
                            <th class="center">Excess</th>
                            <th class="center">Status</th>
                            <th class="center">Mins Late</th>
                            <th class="center">Deduction</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredLogs.forEach(log => {
            const isLive = log.timeOut === null;
            const durationObj = calculateDuration(log.timeIn, log.timeOut, isLive);
            const excessStr = getExcessHours(durationObj.rawHours);
            const deduction = calcRowDeduction(log);

            html += `
                <tr>
                    <td>${log.employee.firstName} ${log.employee.lastName}</td>
                    <td class="center">${new Date(log.date).toLocaleDateString()}</td>
                    <td class="center">${formatTime(log.timeIn)}</td>
                    <td class="center">${formatTime(log.timeOut)}</td>
                    <td class="center">${durationObj.formatted}</td>
                    <td class="center">${excessStr}</td>
                    <td class="center">${log.status}</td>
                    <td class="center ${deduction?.isLate ? 'tardy' : 'ontime'}">${deduction ? deduction.totalMinutesLate + ' min' : '—'}</td>
                    <td class="center ${deduction?.isLate ? 'tardy' : 'ontime'}">${deduction ? '₱' + deduction.deductionAmount.toFixed(2) : '—'}</td>
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

    // =========================================================================
    // Render
    // =========================================================================
    return (
        <div className="p-8 h-screen overflow-hidden flex flex-col bg-slate-50 font-sans">
            {/* Header section */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Organization DTR</h1>
                    <p className="text-gray-500 mt-1">Monitor real-time shift clocks, durations, and historical records across the company.</p>
                </div>
                
                <div className="flex gap-4 items-center">
                    {/* Work Factor Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(s => !s)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-indigo-600">{workFactor}-day</span>
                            <svg className={`w-3 h-3 text-slate-400 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showSettings && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">PH Work Factor</p>
                                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                    Used to derive the Daily Rate for late deductions.<br />
                                    <span className="font-bold text-slate-600">313</span> = Mon–Sat schedule<br />
                                    <span className="font-bold text-slate-600">261</span> = Mon–Fri schedule
                                </p>
                                <div className="flex gap-2">
                                    {([313, 261] as WorkFactor[]).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => { setWorkFactor(f); setShowSettings(false); }}
                                            className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                                                workFactor === f
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {f}-day
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 font-medium">
                                    Lunch break: {lunchStart}–{lunchEnd} (fixed, 60 min)
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search employee, ID, or dept..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border-none shadow-sm text-slate-800 text-sm font-bold rounded-2xl block w-64 pl-10 p-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                    </div>
                    
                    <div className="flex items-center bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition-all overflow-hidden">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">From</span>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-slate-800 text-sm font-bold p-2 outline-none cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-300 mx-2 uppercase tracking-widest">To</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-slate-800 text-sm font-bold p-2 outline-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePurgeGhosts}
                            className="flex items-center gap-2 px-5 py-3 bg-white text-rose-600 font-bold rounded-2xl border-2 border-rose-50 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                            title="Delete records with invalid dates (2033, 2000, etc.)"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Clear Ghosts</span>
                        </button>
                        
                        <button
                            onClick={handleSyncAll}
                            disabled={isSyncing}
                            className={`group relative flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${
                                isSyncing 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200'
                            }`}
                        >
                            <div className={`transition-all duration-700 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            {isSyncing ? 'Syncing...' : 'Sync Fleet Logs'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Log Panel */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Workforce Activity Log</h3>
                        {/* Tardy summary chip */}
                        {!loading && (() => {
                            const tardyCount = filteredLogs.filter(l => calcRowDeduction(l)?.isLate).length;
                            if (tardyCount === 0) return null;
                            return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-100 rounded-lg text-[10px] font-black text-red-600 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                    {tardyCount} Tardy {tardyCount === 1 ? 'Record' : 'Records'}
                                </span>
                            );
                        })()}
                    </div>
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
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Clock In</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Clock Out</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Duration</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Excess Hrs</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                                        Tardy / Deduction
                                        <span className="ml-1 text-indigo-400 normal-case">{workFactor}-day</span>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 border-t border-gray-100/50">
                                {filteredLogs.map(log => {
                                    const isLive = log.timeOut === null;
                                    const durationObj = calculateDuration(log.timeIn, log.timeOut, isLive);
                                    const excessStr = getExcessHours(durationObj.rawHours);
                                    const deduction = calcRowDeduction(log);
                                    
                                    return (
                                        <tr key={log.id} className={`hover:bg-slate-50/50 transition-colors group ${deduction?.isLate ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-300">
                                                        {log.employee.pictureUrl ? (
                                                            <img src={log.employee.pictureUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <svg className="w-5 h-5 relative top-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-800">{log.employee.firstName} {log.employee.lastName}</span>
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-black border border-indigo-100" title="Employee Number">#{log.employee.employeeNo || 'NO ID'}</span>
                                                        </div>
                                                        <div className="text-[11px] font-bold tracking-wide text-slate-400 uppercase mt-0.5">{log.employee.department?.name || 'Unassigned'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="font-bold text-slate-600 text-sm">{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-sm ${deduction?.isLate ? 'bg-red-50 text-red-700' : 'bg-indigo-50/50 text-indigo-700'}`}>
                                                    <svg className={`w-3.5 h-3.5 ${deduction?.isLate ? 'text-red-400' : 'text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
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
                                                    <span className="inline-flex items-center gap-1.5 text-amber-500 font-black text-[10px] tracking-widest uppercase px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                                        Ongoing
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-sm font-bold ${isLive ? 'text-amber-600' : 'text-slate-600'}`}>{durationObj.formatted}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-sm font-black tracking-wide ${excessStr !== '--' ? 'text-indigo-600' : 'text-slate-300'}`}>{excessStr}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-1 items-center justify-center">
                                                    {log.status.split(', ').map((stat, idx) => (
                                                        <span key={idx} className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider inline-block ${
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

                                            {/* ── NEW: Tardy / Deduction Column ─────────────────────── */}
                                            <td className="px-6 py-4 text-center">
                                                {deduction === null ? (
                                                    <span className="text-slate-300 font-black text-sm">—</span>
                                                ) : deduction.isLate ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-200 rounded-md text-[10px] font-black text-red-600 uppercase tracking-wider">
                                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                                            Tardy · {deduction.totalMinutesLate}m
                                                        </span>
                                                        <span
                                                            className="text-sm font-black text-red-600 tabular-nums"
                                                            title={deduction.breakdown}
                                                        >
                                                            {formatPHP(deduction.deductionAmount)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                        On Time
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {log.incidentReportUrl && (
                                                        <a 
                                                            href={log.incidentReportUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center justify-center focus:ring-2 focus:ring-rose-500"
                                                            title="View Incident Report"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => openEditModal(log)}
                                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center justify-center focus:ring-2 focus:ring-indigo-500"
                                                        title="Edit Record"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredLogs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-medium tracking-wide">No employment logs found on this span.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Editing Modal */}
            {editingLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Edit Time Record</h3>
                                <p className="text-sm text-slate-500 mt-1">Modifying {editingLog.employee.firstName}'s shift on {new Date(editingLog.date).toLocaleDateString()}</p>
                            </div>
                            <button 
                                onClick={() => setEditingLog(null)}
                                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Administrative Override
                                </h4>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    You are manually adjusting biometric log arrays. Changes are strictly audited. Clearing the Clock Out fields will mark the shift as "Ongoing" again.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                        Clock In Anchor
                                    </h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <input type="date" value={editTimeInDate} onChange={e => setEditTimeInDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" required />
                                        </div>
                                        <div>
                                            <input type="time" value={editTimeInTime} onChange={e => setEditTimeInTime(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" required />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4-4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        Clock Out Anchor
                                    </h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <input type="date" value={editTimeOutDate} onChange={e => setEditTimeOutDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div>
                                            <input type="time" value={editTimeOutTime} onChange={e => setEditTimeOutTime(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Leave these blank to revert the shift to "Ongoing".</p>
                                </div>

                                {/* Incident Report Attachment */}
                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                    <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        Incident Report (Required)
                                    </h5>
                                    
                                    {editIncidentReportUrl ? (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32 w-full bg-slate-100 group">
                                            <img src={editIncidentReportUrl} alt="Incident Report" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => setEditIncidentReportUrl('')} className="bg-white/20 hover:bg-white text-white hover:text-rose-600 rounded-full p-2 backdrop-blur-sm transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center transition-colors bg-white group cursor-pointer">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageUpload} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-xs font-bold uppercase tracking-wider">Click to Upload Image</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingLog(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveEdit}
                                disabled={isSaving || !editTimeInDate || !editTimeInTime || !editIncidentReportUrl}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
