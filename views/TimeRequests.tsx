'use client';

import React, { useState, useEffect } from 'react';

// Interfaces
interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
    position?: { name: string } | null;
    pictureUrl?: string | null;
}

interface TimeRequest {
    id: string;
    employeeId: string;
    employee: Employee;
    type: string; // "Overtime" | "Undertime"
    date: string;
    startTime: string;
    endTime: string;
    reason: string | null;
    status: string; // "Pending" | "Approved" | "Rejected"
    createdAt: string;
}

const TimeRequestsView = () => {
    const [requests, setRequests] = useState<TimeRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [requestType, setRequestType] = useState('Overtime');
    const [requestDate, setRequestDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchData();
        // Set default date to today for the form
        setRequestDate(new Date().toISOString().split('T')[0]);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [requestsRes, employeesRes] = await Promise.all([
                fetch('/api/time-requests'),
                fetch('/api/employees')
            ]);
            setRequests(await requestsRes.json());
            setEmployees(await employeesRes.json());
        } catch (error) {
            console.error('Failed to fetch time requests data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/time-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployeeId,
                    type: requestType,
                    date: requestDate,
                    startTime,
                    endTime,
                    reason
                })
            });

            if (res.ok) {
                setIsCreateModalOpen(false);
                resetForm();
                fetchData();
            } else {
                const errorData = await res.json();
                alert(errorData.error || 'Failed to file request');
            }
        } catch (error) {
            console.error('Error saving request:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/time-requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this recorded time request?')) return;
        try {
            const res = await fetch(`/api/time-requests/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Error deleting request:', error);
        }
    };

    const resetForm = () => {
        setSelectedEmployeeId('');
        setRequestType('Overtime');
        setRequestDate(new Date().toISOString().split('T')[0]);
        setStartTime('');
        setEndTime('');
        setReason('');
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return '';
        const startDate = new Date(`1970-01-01T${start}:00`);
        const endDate = new Date(`1970-01-01T${end}:00`);
        const diffMs = endDate.getTime() - startDate.getTime();
        if (diffMs < 0) return 'Invalid Range'; // End before start

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
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; // Pending
        }
    };

    const getTypeColor = (type: string) => {
        return type === 'Overtime' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100';
    };

    return (
        <div className="p-8 h-screen overflow-hidden flex flex-col bg-slate-50">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Time Requests</h1>
                    <p className="text-gray-500 mt-1">Review and process employee requests for overtime and undertime.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    File New Request
                </button>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Type</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {req.employee?.pictureUrl ? (
                                                    <img src={req.employee.pictureUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm shrink-0">
                                                        {req.employee?.firstName[0]}{req.employee?.lastName[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-900">{req.employee?.firstName} {req.employee?.lastName}</div>
                                                    <div className="text-[11px] font-bold text-gray-400 tracking-wide uppercase">{req.employee?.department?.name || 'No Dept'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeColor(req.type)}`}>
                                                {req.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{new Date(req.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{req.startTime} • {req.endTime}</span>
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                                    {calculateDuration(req.startTime, req.endTime)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[200px] truncate text-sm text-gray-600" title={req.reason || ''}>
                                                {req.reason || <span className="text-gray-300 italic">No reason provided</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${getStatusStyle(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {req.status === 'Pending' && (
                                                    <>
                                                        <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 tooltip" title="Approve">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                        </button>
                                                        <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="p-1.5 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors border border-transparent hover:border-pink-100 tooltip" title="Reject">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => handleDelete(req.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors tooltip ml-4" title="Delete record">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="mx-auto w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <p className="text-slate-500 font-medium tracking-tight">No time requests found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Request Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">File Time Request</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-xl transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreateRequest} className="p-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee</label>
                                    <select required value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow">
                                        <option value="">-- Select Employee --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.position?.name || 'No Title'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Request Type</label>
                                        <select required value={requestType} onChange={e => setRequestType(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow">
                                            <option value="Overtime">Overtime</option>
                                            <option value="Undertime">Undertime</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                                        <input required type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Time</label>
                                        <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Time</label>
                                        <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</label>
                                    <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide context for this request..." className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow resize-none"></textarea>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors shadow-sm">
                                    Cancel
                                </button>
                                <button disabled={isSaving} type="submit" className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                                    {isSaving ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeRequestsView;
