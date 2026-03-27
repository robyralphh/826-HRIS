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
    userRole?: {
        id: string;
        name: string;
        parentRoleId: string | null;
    } | null;
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

interface LeaveRequest {
    id: string;
    employeeId: string;
    employee: Employee;
    type: string; // "Leave (PTO)" | "Sick Leave"
    startDate: string;
    endDate: string;
    reason: string | null;
    status: string; // "Pending" | "Approved" | "Rejected"
    createdAt: string;
}

const TimeRequestsView = () => {
    const [activeTab, setActiveTab] = useState<'intra' | 'leaves'>('intra');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Intra-Day (OT/UT) State
    const [timeRequests, setTimeRequests] = useState<TimeRequest[]>([]);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [timeRequestType, setTimeRequestType] = useState('Overtime');
    const [requestDate, setRequestDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    
    // Leaves (PTO/Sick) State
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leaveType, setLeaveType] = useState('Leave (PTO)');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [permissions, setPermissions] = useState({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

    useEffect(() => {
        fetchData();
        loadPermissions();
        const today = new Date().toISOString().split('T')[0];
        setRequestDate(today);
        setStartDate(today);
        setEndDate(today);
    }, []);

    const loadPermissions = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                
                const roleName = typeof userObj.role === 'string' ? userObj.role : userObj.role?.name;
                if (roleName === 'Super Admin') {
                    setPermissions({ canView: true, canCreate: true, canEdit: true, canDelete: true });
                    return;
                }

                const reqPerm = userObj.role?.permissions?.find((p: any) => p.module === 'Time Requests');
                if (reqPerm) {
                    setPermissions({
                        canView: reqPerm.canView,
                        canCreate: reqPerm.canCreate,
                        canEdit: reqPerm.canEdit,
                        canDelete: reqPerm.canDelete
                    });
                }
            }
        } catch (error) {
            console.error('Error loading permissions', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            const adminId = userStr ? JSON.parse(userStr).id : '';

            const reqOptions = {
                headers: { 'x-admin-id': adminId }
            };

            const [timeRes, leaveRes, empRes] = await Promise.all([
                fetch('/api/time-requests', reqOptions),
                fetch('/api/leave-requests', reqOptions),
                fetch('/api/employees')
            ]);
            setTimeRequests(await timeRes.json());
            setLeaveRequests(await leaveRes.json());
            setEmployees(await empRes.json());
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTimeRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/time-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify({ employeeId: selectedEmployeeId, type: timeRequestType, date: requestDate, startTime, endTime, reason })
            });
            if (res.ok) { setIsTimeModalOpen(false); resetForms(); fetchData(); } 
            else { alert((await res.json()).error || 'Failed to file request'); }
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const handleCreateLeaveRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/leave-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify({ employeeId: selectedEmployeeId, type: leaveType, startDate, endDate, reason })
            });
            if (res.ok) { setIsLeaveModalOpen(false); resetForms(); fetchData(); } 
            else { alert((await res.json()).error || 'Failed to file request'); }
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const handleStatusUpdate = async (type: 'time' | 'leave', id: string, newStatus: string) => {
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const endpoint = type === 'time' ? `/api/time-requests/${id}` : `/api/leave-requests/${id}`;
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchData();
        } catch (error) { console.error('Error updating status:', error); }
    };

    const handleDelete = async (type: 'time' | 'leave', id: string) => {
        if (!confirm('Are you sure you want to delete this recorded request?')) return;
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const endpoint = type === 'time' ? `/api/time-requests/${id}` : `/api/leave-requests/${id}`;
            const res = await fetch(endpoint, { method: 'DELETE', headers: { 'x-admin-id': adminId } });
            if (res.ok) fetchData();
        } catch (error) { console.error('Error deleting request:', error); }
    };

    const resetForms = () => {
        setSelectedEmployeeId('');
        setTimeRequestType('Overtime');
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

    const renderEmployeeInfo = (employee: Employee) => (
        <div className="flex items-center gap-3">
            {employee?.pictureUrl ? (
                <img src={employee.pictureUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
            ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm shrink-0">
                    {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                </div>
            )}
            <div>
                <div className="font-bold text-gray-900">{employee?.firstName} {employee?.lastName}</div>
                <div className="text-[11px] font-bold text-gray-400 tracking-wide uppercase">{employee?.department?.name || 'No Dept'}</div>
            </div>
        </div>
    );

    const renderActions = (id: string, status: string, type: 'time' | 'leave', reqEmployee: Employee) => {
        let isHierarchyMatch = false;

        const userStr = localStorage.getItem('user');
        if (userStr) {
            const currentUser = JSON.parse(userStr);
            const currentRoleId = currentUser.role?.id;
            const currentRoleName = typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.name;
            
            if (currentRoleName === 'Super Admin') {
                isHierarchyMatch = true;
            } else if (currentUser.role?.isManager && reqEmployee.userRole?.parentRoleId === currentRoleId) {
                isHierarchyMatch = true;
            }
        }

        return (
        <div className="flex items-center justify-end gap-2">
            {status === 'Pending' && permissions.canEdit && isHierarchyMatch && (
                <>
                    <button onClick={() => handleStatusUpdate(type, id, 'Approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 tooltip" title="Approve">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onClick={() => handleStatusUpdate(type, id, 'Rejected')} className="p-1.5 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors border border-transparent hover:border-pink-100 tooltip" title="Reject">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </>
            )}
            {permissions.canDelete && (
                <button onClick={() => handleDelete(type, id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors tooltip ml-4" title="Delete record">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}
        </div>
        );
    };

    return (
        <div className="p-8 h-screen overflow-hidden flex flex-col bg-slate-50">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Time Requests</h1>
                    <p className="text-gray-500 mt-1">Review and process employee requests for overtime, undertime, and leaves.</p>
                </div>
                {permissions.canCreate && (
                    <button
                        onClick={() => activeTab === 'intra' ? setIsTimeModalOpen(true) : setIsLeaveModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        File New {activeTab === 'intra' ? 'OT/UT' : 'Leave'}
                    </button>
                )}
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex gap-2 bg-slate-50/50">
                    <button onClick={() => setActiveTab('intra')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'intra' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Intra-Day (OT/UT)</button>
                    <button onClick={() => setActiveTab('leaves')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'leaves' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Leaves (PTO/Sick)</button>
                </div>

                <div className="overflow-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : activeTab === 'intra' ? (
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
                                {timeRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">{renderEmployeeInfo(req.employee)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${req.type === 'Overtime' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>{req.type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{new Date(req.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div className="flex items-center gap-2 mt-0.5"><span className="text-xs font-bold text-slate-500 uppercase">{req.startTime} • {req.endTime}</span><span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">{calculateDuration(req.startTime, req.endTime)}</span></div>
                                        </td>
                                        <td className="px-6 py-4"><div className="max-w-[200px] truncate text-sm text-gray-600" title={req.reason || ''}>{req.reason || <span className="text-gray-300 italic">No reason</span>}</div></td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${getStatusStyle(req.status)}`}>{req.status}</span></td>
                                        <td className="px-6 py-4 text-right">{renderActions(req.id, req.status, 'time', req.employee)}</td>
                                    </tr>
                                ))}
                                {timeRequests.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium tracking-tight">No time requests found.</td></tr>}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Type</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Start Date</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">End Date</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaveRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">{renderEmployeeInfo(req.employee)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${req.type === 'Sick Leave' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>{req.type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{new Date(req.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{new Date(req.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        </td>
                                        <td className="px-6 py-4"><div className="max-w-[200px] truncate text-sm text-gray-600" title={req.reason || ''}>{req.reason || <span className="text-gray-300 italic">No reason</span>}</div></td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${getStatusStyle(req.status)}`}>{req.status}</span></td>
                                        <td className="px-6 py-4 text-right">{renderActions(req.id, req.status, 'leave', req.employee)}</td>
                                    </tr>
                                ))}
                                {leaveRequests.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium tracking-tight">No leave requests found.</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Intra-day Modal */}
            {isTimeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">File Time Request</h3>
                            <button onClick={() => setIsTimeModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleCreateTimeRequest} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee</label>
                                    <select required value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">-- Select Employee --</option>{employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.position?.name || 'No Title'})</option>))}</select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Request Type</label>
                                        <select required value={timeRequestType} onChange={e => setTimeRequestType(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Overtime">Overtime</option><option value="Undertime">Undertime</option></select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                                        <input required type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Time</label>
                                        <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Time</label>
                                        <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</label><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea></div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3"><button type="button" onClick={() => setIsTimeModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl shadow-sm">Cancel</button><button disabled={isSaving} type="submit" className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">{isSaving ? 'Submitting...' : 'Submit Request'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Leave Modal */}
            {isLeaveModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">File Leave Request</h3>
                            <button onClick={() => setIsLeaveModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleCreateLeaveRequest} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee</label>
                                    <select required value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">-- Select Employee --</option>{employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.position?.name || 'No Title'})</option>))}</select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Leave Type</label>
                                    <select required value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Leave (PTO)">Leave (PTO)</option><option value="Sick Leave">Sick Leave</option></select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                                        <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                                        <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</label><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-gray-200 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea></div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3"><button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl shadow-sm">Cancel</button><button disabled={isSaving} type="submit" className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">{isSaving ? 'Submitting...' : 'Submit Request'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeRequestsView;

