'use client';

import React, { useState, useEffect } from 'react';

// Interfaces
interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    workDays: string[];
    isFlexi: boolean;
    flexiHours: number | null;
    status: string;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeNo?: string;
    department?: { name: string } | null;
    position?: { name: string } | null;
}

interface ScheduleOverride {
    id: string;
    employeeId: string;
    employee: Employee;
    date: string;
    startTime: string | null;
    endTime: string | null;
    isRestDay: boolean;
    reason: string | null;
}

interface Schedule {
    id: string;
    employeeId: string;
    employee: Employee;
    mondayId: string | null; monday?: Shift | null;
    tuesdayId: string | null; tuesday?: Shift | null;
    wednesdayId: string | null; wednesday?: Shift | null;
    thursdayId: string | null; thursday?: Shift | null;
    fridayId: string | null; friday?: Shift | null;
    saturdayId: string | null; saturday?: Shift | null;
    sundayId: string | null; sunday?: Shift | null;
}

const ScheduleView = () => {
    const [activeTab, setActiveTab] = useState<'roster' | 'shifts' | 'overrides'>('roster');
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Shift Form
    const [shiftId, setShiftId] = useState('');
    const [shiftName, setShiftName] = useState('');
    const [shiftStart, setShiftStart] = useState('09:00');
    const [shiftEnd, setShiftEnd] = useState('17:00');
    const [shiftDays, setShiftDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const [shiftIsFlexi, setShiftIsFlexi] = useState(false);
    const [shiftFlexiHours, setShiftFlexiHours] = useState<number>(8);

    // Roster Form Modal
    const [activeSchedule, setActiveSchedule] = useState<Partial<Schedule> | null>(null);

    // Overrides Filter & Form
    const [overrideMonth, setOverrideMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [activeOverride, setActiveOverride] = useState<Partial<ScheduleOverride> | null>(null);
    const [overrideEmployeeSearch, setOverrideEmployeeSearch] = useState('');

    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const [permissions, setPermissions] = useState({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

    useEffect(() => {
        loadPermissions();
    }, []);

    useEffect(() => {
        fetchData();
    }, [overrideMonth]);

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

                const attPerm = userObj.role?.permissions?.find((p: any) => p.module === 'Schedules');
                if (attPerm) {
                    setPermissions({
                        canView: attPerm.canView,
                        canCreate: attPerm.canCreate,
                        canEdit: attPerm.canEdit,
                        canDelete: attPerm.canDelete
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
            const [shiftsRes, schedulesRes, employeesRes, overridesRes] = await Promise.all([
                fetch('/api/shifts'),
                fetch('/api/schedules'),
                fetch('/api/employees'),
                fetch(`/api/schedules/overrides?startDate=${overrideMonth}-01&endDate=${overrideMonth}-31`)
            ]);

            if (shiftsRes.ok) {
                const data = await shiftsRes.json();
                if (Array.isArray(data)) setShifts(data);
            }

            if (schedulesRes.ok) {
                const data = await schedulesRes.json();
                if (Array.isArray(data)) setSchedules(data);
            }

            if (employeesRes.ok) {
                const data = await employeesRes.json();
                if (Array.isArray(data)) setEmployees(data);
            }

            if (overridesRes.ok) {
                const data = await overridesRes.json();
                if (Array.isArray(data)) setOverrides(data);
            }
        } catch (error) {
            console.error('Failed to fetch scheduling data', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Master Shifts ---
    const resetShiftForm = () => {
        setShiftId(''); setShiftName(''); setShiftStart('09:00'); setShiftEnd('17:00'); setShiftDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        setShiftIsFlexi(false); setShiftFlexiHours(8);
    };

    const handleEditShift = (s: Shift) => {
        setShiftId(s.id); setShiftName(s.name); setShiftStart(s.startTime); setShiftEnd(s.endTime); setShiftDays(s.workDays);
        setShiftIsFlexi(s.isFlexi); setShiftFlexiHours(s.flexiHours || 8);
    };

    const toggleWorkDay = (day: string) => {
        setShiftDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleSaveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const url = shiftId ? `/api/shifts/${shiftId}` : '/api/shifts';
        const method = shiftId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: shiftName, 
                    startTime: shiftIsFlexi ? "00:00" : shiftStart, 
                    endTime: shiftIsFlexi ? "00:00" : shiftEnd, 
                    workDays: shiftDays,
                    isFlexi: shiftIsFlexi,
                    flexiHours: shiftIsFlexi ? shiftFlexiHours : null
                })
            });

            if (res.ok) {
                resetShiftForm();
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (!confirm('Delete this shift? This will not remove it from employees currently assigned to it, but it will no longer be available for new assignments.')) return;
        try {
            const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    // --- Roster Assignment ---
    const handleSaveRoster = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSchedule?.employeeId) return;

        setIsSaving(true);
        try {
            const userStr = localStorage.getItem('user');
            const userObj = userStr ? JSON.parse(userStr) : null;
            const adminId = userObj?.id || '';

            const res = await fetch('/api/schedules', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify(activeSchedule)
            });

            if (res.ok) {
                setActiveSchedule(null);
                fetchData();
            } else {
                alert('Failed to save schedule');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const openScheduleModal = (employeeOrSchedule: Employee | Schedule) => {
        // Find existing schedule or start fresh
        if ('employeeId' in employeeOrSchedule) {
            // It's a Schedule object
            setActiveSchedule({
                employeeId: employeeOrSchedule.employeeId,
                mondayId: employeeOrSchedule.mondayId,
                tuesdayId: employeeOrSchedule.tuesdayId,
                wednesdayId: employeeOrSchedule.wednesdayId,
                thursdayId: employeeOrSchedule.thursdayId,
                fridayId: employeeOrSchedule.fridayId,
                saturdayId: employeeOrSchedule.saturdayId,
                sundayId: employeeOrSchedule.sundayId,
                employee: employeeOrSchedule.employee
            });
        } else {
            // It's just an Employee, create fresh empty schedule tracking
            setActiveSchedule({
                employeeId: employeeOrSchedule.id,
                employee: employeeOrSchedule as any
            });
        }
    };

    const handleDayShiftChange = (day: string, shiftId: string) => {
        setActiveSchedule(prev => ({ ...prev, [`${day.toLowerCase()}Id`]: shiftId === '' ? null : shiftId }));
    };

    // --- Render Helpers
    const renderShiftBadge = (schedule?: Schedule | null, day?: string) => {
        const shiftKey = day ? day.toLowerCase() : null;
        const shift = shiftKey ? (schedule as any)?.[shiftKey] : null;

        if (shift && shift.isFlexi) {
            const displayHours = shift.flexiHours;
            return (
                <div className="flex flex-col items-center">
                    <span className="font-black text-indigo-600 text-[10px] uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded">Flexi</span>
                    <span className="text-xs font-bold text-slate-800">{displayHours} hrs</span>
                </div>
            );
        }

        if (!shift) return <span className="text-gray-400 text-xs italic">Off / No Shift</span>;
        return (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-sm truncate">{shift.name}</span>
                <span className="text-xs text-indigo-600 font-semibold">{shift.startTime} - {shift.endTime}</span>
            </div>
        );
    };

    const renderShiftsTab = () => {
        const safeShifts = Array.isArray(shifts) ? shifts : [];
        
        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-2xl font-black text-gray-900">Master Shifts</h2>
                    <p className="text-gray-500">Create standardized shifts that you can map to employee schedules.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex gap-6">
                    <div className="w-1/3">
                        {permissions.canCreate && (
                            <form onSubmit={handleSaveShift} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-0">
                                <h3 className="font-bold text-lg mb-4">{shiftId ? 'Edit Shift' : 'Create New Shift'}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                                        <input required type="text" value={shiftName} onChange={e => setShiftName(e.target.value)} placeholder="e.g. Morning Shift" className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-100 pb-2">Shift Type</label>
                                        <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-4">
                                            <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${shiftIsFlexi ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => setShiftIsFlexi(!shiftIsFlexi)}>
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${shiftIsFlexi ? 'left-5.5' : 'left-0.5'}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-xs">Flexi Shift</p>
                                                <p className="text-[10px] text-slate-500">No fixed start/end time. No late flags.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {shiftIsFlexi ? (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Required Daily Hours</label>
                                            <input 
                                                required 
                                                type="number" 
                                                step="0.5"
                                                value={shiftFlexiHours} 
                                                onChange={e => setShiftFlexiHours(parseFloat(e.target.value))} 
                                                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500" 
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                                                <input required type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                                                <input required type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500" />
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Work Days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map(day => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => toggleWorkDay(day)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${shiftDays.includes(day) ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    {day.substring(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        {shiftId && <button type="button" onClick={resetShiftForm} className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>}
                                        <button disabled={isSaving} type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                                            {isSaving ? 'Saving...' : 'Save Shift'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="w-2/3 grid grid-cols-2 gap-4 h-fit">
                        {safeShifts.map(shift => (
                        <div key={shift.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{shift.name}</h4>
                                    {shift.isFlexi ? (
                                        <span className="px-2.5 py-1 text-xs font-black bg-indigo-50 text-indigo-700 rounded-lg">Flexi ({shift.flexiHours}h)</span>
                                    ) : (
                                        <span className="px-2.5 py-1 text-xs font-black bg-slate-100 text-slate-700 rounded-lg">{shift.startTime} - {shift.endTime}</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {DAYS_OF_WEEK.map(d => (
                                        <span key={d} className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${shift.workDays.includes(d) ? 'bg-slate-800 text-white' : 'text-gray-300'}`}>
                                            {d[0]}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                                {permissions.canEdit && (
                                    <button onClick={() => handleEditShift(shift)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Edit">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                )}
                                {permissions.canDelete && (
                                    <button onClick={() => handleDeleteShift(shift.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Delete">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {safeShifts.length === 0 && (
                        <div className="col-span-2 text-center p-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white">No shifts created yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

    const renderRosterTab = () => {
        // Find employees without schedules
        const safeSchedules = Array.isArray(schedules) ? schedules : [];
        const safeEmployees = Array.isArray(employees) ? employees : [];
        const unscheduledEmployees = safeEmployees.filter(emp => !safeSchedules.some(s => s.employeeId === emp.id));

        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-2xl font-black text-gray-900">Weekly Roster</h2>
                    <p className="text-gray-500">Assign employees to fixed weekly shift rotations.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Active Schedules Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#f1f5f9]">Employee</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 border-l border-gray-100">Mon</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 border-l border-gray-100">Tue</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 border-l border-gray-100">Wed</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 border-l border-gray-100">Thu</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 border-l border-gray-100">Fri</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 bg-slate-50/80 border-l border-gray-100">Sat</th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-center w-32 bg-slate-50/80 border-l border-gray-100">Sun</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {safeSchedules.map(schedule => (
                                        <tr key={schedule.id} onClick={() => permissions.canEdit && openScheduleModal(schedule)} className={`${permissions.canEdit ? 'hover:bg-indigo-50/30 cursor-pointer' : ''} transition-colors group`}>
                                            <td className={`px-6 py-4 sticky left-0 bg-white ${permissions.canEdit ? 'group-hover:bg-indigo-50/30' : ''} shadow-[1px_0_0_0_#f1f5f9]`}>
                                                <div className="font-bold text-gray-900">{schedule.employee?.firstName} {schedule.employee?.lastName}</div>
                                                <div className="text-xs text-gray-500">{schedule.employee?.position?.name || schedule.employee?.department?.name || 'Unassigned'}</div>
                                            </td>
                                            <td className="px-4 py-4 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'monday')}</td>
                                            <td className="px-4 py-4 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'tuesday')}</td>
                                            <td className="px-4 py-4 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'wednesday')}</td>
                                            <td className="px-4 py-4 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'thursday')}</td>
                                            <td className="px-4 py-4 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'friday')}</td>
                                            <td className="px-4 py-4 bg-slate-50/30 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'saturday')}</td>
                                            <td className="px-4 py-4 bg-slate-50/30 border-l border-gray-100 text-center hover:bg-indigo-50/50">{renderShiftBadge(schedule, 'sunday')}</td>
                                        </tr>
                                    ))}
                                    {safeSchedules.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 border-none">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    <span>No schedules created yet.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Unscheduled Employees */}
                    {unscheduledEmployees.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Unscheduled Employees ({unscheduledEmployees.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {unscheduledEmployees.map(emp => (
                                    <div key={emp.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div className="truncate pr-2">
                                            <div className="font-bold text-gray-900 truncate">{emp.firstName} {emp.lastName}</div>
                                            <div className="text-xs text-gray-500 truncate">{emp.position?.name || 'Unassigned'}</div>
                                        </div>
                                        {permissions.canCreate && (
                                            <button onClick={() => openScheduleModal(emp)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg shrink-0 transition-colors tooltip" title="Create Schedule">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const renderOverridesTab = () => {
        const safeOverrides = Array.isArray(overrides) ? overrides : [];
        
        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Daily Exceptions</h2>
                        <p className="text-gray-500">Manage date-specific shift overrides for individual employees.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center bg-white rounded-xl ring-1 ring-slate-200 shadow-sm px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Month</span>
                            <input 
                                type="month" 
                                value={overrideMonth} 
                                onChange={(e) => setOverrideMonth(e.target.value)}
                                className="bg-transparent border-none text-slate-800 text-sm font-bold p-2 outline-none cursor-pointer"
                            />
                        </div>
                        {permissions.canCreate && (
                            <button 
                                onClick={() => setActiveOverride({ date: new Date().toISOString().split('T')[0], isRestDay: false, startTime: '09:00', endTime: '18:00' })}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                Add Exception
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Override Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Shift Schedule</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason / Note</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {safeOverrides.map(ov => (
                                    <tr key={ov.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{ov.employee?.firstName} {ov.employee?.lastName}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{ov.employee?.employeeNo || 'NO ID'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2.5 py-1 rounded-lg">
                                                {new Date(ov.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${ov.isRestDay ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                {ov.isRestDay ? 'Rest Day' : 'Shift Change'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {ov.isRestDay ? (
                                                <span className="text-slate-300 font-bold italic text-xs">No Work Required</span>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/50 rounded-lg text-indigo-700 font-bold text-sm">
                                                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {ov.startTime} - {ov.endTime}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 font-medium italic truncate max-w-[200px] block">{ov.reason || 'No reason provided'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {permissions.canEdit && (
                                                    <button onClick={() => {
                                                        setActiveOverride({
                                                            ...ov,
                                                            date: new Date(ov.date).toISOString().split('T')[0]
                                                        });
                                                    }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                                {permissions.canDelete && (
                                                    <button onClick={() => handleDeleteOverride(ov.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {safeOverrides.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium tracking-wide">
                                            <svg className="w-12 h-12 mx-auto mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            No daily exceptions recorded for this month.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    const handleSaveOverride = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOverride?.employeeId || !activeOverride.date) {
            alert('Please select an employee and date.');
            return;
        }

        setIsSaving(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const res = await fetch('/api/schedules/overrides', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify(activeOverride)
            });

            if (res.ok) {
                setActiveOverride(null);
                setOverrideEmployeeSearch('');
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save exception');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteOverride = async (id: string) => {
        if (!confirm('Remove this exception? The employee will revert to their master weekly roster for this day.')) return;
        try {
            const res = await fetch(`/api/schedules/overrides?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-8 h-screen overflow-hidden flex flex-col bg-slate-50">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Work Schedules</h1>
                    <p className="text-gray-500 mt-1">Manage employee shift rotations and standard working hours.</p>
                </div>

                <div className="flex bg-gray-200/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'roster' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Weekly Roster
                    </button>
                    <button
                        onClick={() => setActiveTab('overrides')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'overrides' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Daily Exceptions
                    </button>
                    <button
                        onClick={() => setActiveTab('shifts')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'shifts' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Master Shifts
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {activeTab === 'shifts' ? renderShiftsTab() : activeTab === 'overrides' ? renderOverridesTab() : renderRosterTab()}
                </div>
            )}

            {/* Editing Schedule Assignment Modal */}
            {activeSchedule && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Weekly Schedule</h3>
                                <p className="text-slate-500 mt-1 font-medium">{activeSchedule.employee?.firstName} {activeSchedule.employee?.lastName} • {activeSchedule.employee?.position?.name || 'Unassigned'}</p>
                            </div>
                            <button onClick={() => setActiveSchedule(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveRoster}>
                            <div className="p-6 grid gap-6 max-h-[60vh] overflow-y-auto">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                        <label className={`w-32 font-bold text-sm ${(day === 'Saturday' || day === 'Sunday') ? 'text-indigo-600' : 'text-slate-700'}`}>
                                            {day}
                                        </label>
                                        <select
                                            value={(activeSchedule as any)[`${day.toLowerCase()}Id`] || ''}
                                            onChange={(e) => handleDayShiftChange(day, e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">-- OFF / No Shift --</option>
                                            {shifts.map(shift => (
                                                <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setActiveSchedule(null)} className="px-6 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 shadow-sm rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button disabled={isSaving} type="submit" className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-xl transition-colors">
                                    {isSaving ? 'Saving...' : 'Save Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Daily Exception Modal */}
            {activeOverride && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{activeOverride.id ? 'Edit Exception' : 'Add Exception'}</h3>
                                <p className="text-slate-500 mt-1 font-medium">Set a date-specific schedule override.</p>
                            </div>
                            <button onClick={() => { setActiveOverride(null); setOverrideEmployeeSearch(''); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveOverride}>
                            <div className="p-8 space-y-6">
                                {/* Employee Selector */}
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target Employee</label>
                                    {activeOverride.id ? (
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 flex items-center gap-3">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                            {activeOverride.employee?.firstName} {activeOverride.employee?.lastName}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <input 
                                                type="text" 
                                                placeholder="Search name or ID..." 
                                                value={overrideEmployeeSearch}
                                                onChange={(e) => setOverrideEmployeeSearch(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none ring-2 ring-transparent focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            />
                                            {overrideEmployeeSearch && (
                                                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl shadow-inner bg-slate-50/50 p-2 space-y-1">
                                                    {employees
                                                        .filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(overrideEmployeeSearch.toLowerCase()))
                                                        .slice(0, 5)
                                                        .map(e => (
                                                            <button 
                                                                key={e.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveOverride({ ...activeOverride, employeeId: e.id, employee: e });
                                                                    setOverrideEmployeeSearch(`${e.firstName} ${e.lastName}`);
                                                                }}
                                                                className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all flex justify-between items-center"
                                                            >
                                                                {e.firstName} {e.lastName}
                                                                <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">#{e.employeeNo || 'No ID'}</span>
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Override Date</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={activeOverride.date || ''} 
                                            onChange={(e) => setActiveOverride({ ...activeOverride, date: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none ring-2 ring-transparent focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Type</label>
                                        <div className="flex bg-slate-100 p-1 rounded-2xl h-[50px]">
                                            <button 
                                                type="button"
                                                onClick={() => setActiveOverride({ ...activeOverride, isRestDay: false })}
                                                className={`flex-1 rounded-xl font-bold text-xs transition-all ${!activeOverride.isRestDay ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Work Shift
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setActiveOverride({ ...activeOverride, isRestDay: true })}
                                                className={`flex-1 rounded-xl font-bold text-xs transition-all ${activeOverride.isRestDay ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Rest Day
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {!activeOverride.isRestDay && (
                                    <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center border-b border-indigo-100 pb-2 mb-2">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Shift Timing</span>
                                            <select 
                                                className="bg-transparent text-xs font-black text-indigo-600 outline-none cursor-pointer"
                                                onChange={(e) => {
                                                    const s = shifts.find(sh => sh.id === e.target.value);
                                                    if (s) setActiveOverride({ ...activeOverride, startTime: s.startTime, endTime: s.endTime });
                                                }}
                                            >
                                                <option value="">Manual Entry / Preset</option>
                                                {shifts.map(sh => (
                                                    <option key={sh.id} value={sh.id}>{sh.name} ({sh.startTime}-{sh.endTime})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1.5 ml-1">Start Time</label>
                                                <input 
                                                    type="time" 
                                                    value={activeOverride.startTime || ''} 
                                                    onChange={(e) => setActiveOverride({ ...activeOverride, startTime: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1.5 ml-1">End Time</label>
                                                <input 
                                                    type="time" 
                                                    value={activeOverride.endTime || ''} 
                                                    onChange={(e) => setActiveOverride({ ...activeOverride, endTime: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Internal Note / Reason</label>
                                    <textarea 
                                        rows={2}
                                        placeholder="e.g. Assigned to inventory count, Emergency leave..."
                                        value={activeOverride.reason || ''}
                                        onChange={(e) => setActiveOverride({ ...activeOverride, reason: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-slate-800 outline-none ring-2 ring-transparent focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => { setActiveOverride(null); setOverrideEmployeeSearch(''); }} 
                                    className="px-6 py-3 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={isSaving} 
                                    type="submit" 
                                    className="px-10 py-3 font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? 'Processing...' : 'Save Exception'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;
