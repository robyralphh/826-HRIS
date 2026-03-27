'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { deriveRates, WorkFactor } from '@/lib/lateDeduction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    salaryType: string;
    baseSalary: number;
    workFactor: 313 | 261;
    department?: { name: string } | null;
    position?: { name: string } | null;
}

type SalaryRateType = 'Monthly' | 'Daily' | 'Hourly';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPHP(v: number, dp = 2) {
    return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

/**
 * Given a value entered in any rate type, derive the canonical monthly basic
 * using the DOLE-standard annualized formula, then use deriveRates() for the
 * full breakdown.
 *
 * Conversion to monthly:
 *   - Daily  → Monthly = (Daily  × factor) / 12
 *   - Hourly → Monthly = (Hourly × 8 × factor) / 12
 */
function toMonthlyBasic(value: number, type: SalaryRateType, factor: WorkFactor): number {
    if (type === 'Monthly') return value;
    if (type === 'Daily')   return (value * factor) / 12;
    // Hourly
    return (value * 8 * factor) / 12;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Compensation = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [salaryType, setSalaryType] = useState<SalaryRateType>('Monthly');
    const [workFactor, setWorkFactor]  = useState<WorkFactor>(313);
    const [inputValue, setInputValue]  = useState('0'); // value in the active rate type

    // Derived rates (recomputed live from inputValue / salaryType / workFactor)
    const derivedRates = useMemo(() => {
        const numVal = parseFloat(inputValue) || 0;
        const monthly = toMonthlyBasic(numVal, salaryType, workFactor);
        return deriveRates(monthly, workFactor);
    }, [inputValue, salaryType, workFactor]);

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        const type = (employee.salaryType || 'Monthly') as SalaryRateType;
        setSalaryType(type);
        setWorkFactor((employee.workFactor === 261 ? 261 : 313) as WorkFactor);
        // Pre-fill the input with the stored base value in that type
        setInputValue((employee.baseSalary || 0).toString());
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;
        setSaving(true);

        // Save the value in the active salary type's own units so handleEdit
        // can pre-fill the correct number on re-open.
        // The payroll route back-converts to a canonical monthly internally.
        const actualBaseSalary = parseFloat(inputValue) || 0;

        try {
            const res = await fetch(`/api/employees/${editingEmployee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salaryType,
                    baseSalary: actualBaseSalary || 0,
                    workFactor,
                })
            });

            if (res.ok) {
                setEditingEmployee(null);
                fetchEmployees();
            } else {
                alert('Failed to save compensation changes');
            }
        } catch (error) {
            console.error('Error saving compensation:', error);
            alert('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Displayed value per type (for the read-only preview rows) ───────────
    function displayedValue(type: SalaryRateType): string {
        if (type === 'Monthly') return derivedRates.monthlyBasic.toFixed(4);
        if (type === 'Daily')   return derivedRates.dailyRate.toFixed(4);
        return derivedRates.hourlyRate.toFixed(4);
    }

    // =========================================================================
    // Render
    // =========================================================================
    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Compensation Management</h1>
                    <p className="text-gray-500 mt-1">
                        Manage employee base rates and salary types.&nbsp;
                        <span className="font-bold text-indigo-500">DOLE-standard: Daily = (Monthly × 12) ÷ factor</span>
                    </p>
                </div>

                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search employee or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Department &amp; Position</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Salary Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Monthly Basic</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Daily Rate <span className="text-indigo-400 normal-case">(DOLE)</span></th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading compensation data...</td></tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No employees found</td></tr>
                            ) : filteredEmployees.map((emp) => {
                                // baseSalary is stored in the employee's own salary-type units
                                // (e.g. ₱500 for a Daily employee means ₱500/day).
                                // Convert to canonical monthly first, then derive all rates.
                                const empFactor = (emp.workFactor === 261 ? 261 : 313) as WorkFactor;
                                const canonical = toMonthlyBasic(
                                    emp.baseSalary || 0,
                                    (emp.salaryType || 'Monthly') as SalaryRateType,
                                    empFactor
                                );
                                const r = deriveRates(canonical, empFactor);
                                return (
                                    <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                                                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{emp.firstName} {emp.lastName}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{emp.employeeId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="text-gray-700 font-medium">{emp.department?.name || 'N/A'}</div>
                                            <div className="text-gray-400 text-xs">{emp.position?.name || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                                                emp.salaryType === 'Monthly' ? 'bg-indigo-50 text-indigo-600' :
                                                emp.salaryType === 'Hourly'  ? 'bg-amber-50  text-amber-600'  :
                                                                               'bg-violet-50 text-violet-600'
                                            }`}>
                                                {emp.salaryType || 'Monthly'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-mono font-bold text-emerald-600 tabular-nums">
                                                {formatPHP(r.monthlyBasic)}
                                            </div>
                                            {emp.salaryType !== 'Monthly' && (
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    stored {emp.salaryType?.toLowerCase()}: {formatPHP(emp.baseSalary || 0)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-mono text-sm font-bold text-slate-600 tabular-nums">
                                                {formatPHP(r.dailyRate, 4)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">{empFactor}-day factor</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleEdit(emp)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Edit rate"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingEmployee && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                        {/* Modal header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Edit Compensation</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {editingEmployee.firstName} {editingEmployee.lastName} &nbsp;·&nbsp;
                                    <span className="text-indigo-500 font-bold">{editingEmployee.employeeId}</span>
                                </p>
                            </div>
                            <button onClick={() => setEditingEmployee(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all shadow-sm">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <form onSubmit={handleSave} id="comp-form" className="p-6 space-y-6">

                                {/* ── Work Factor ─────────────────────────────── */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        PH Work Factor (Annualization)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {([313, 261] as WorkFactor[]).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setWorkFactor(f)}
                                                className={`py-2.5 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                                                    workFactor === f
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md'
                                                        : 'border-gray-100 text-gray-400 hover:border-indigo-200'
                                                }`}
                                            >
                                                {f}-day · {f === 313 ? 'Mon–Sat' : 'Mon–Fri'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                        Daily = (Monthly × 12) ÷ {workFactor} &nbsp;|&nbsp; Hourly = Daily ÷ 8 &nbsp;|&nbsp; Minute = Hourly ÷ 60
                                    </p>
                                </div>

                                {/* ── Salary Type ─────────────────────────────── */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Salary Rate Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['Monthly', 'Daily', 'Hourly'] as SalaryRateType[]).map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    // Sync the input value to the equivalent in the new type
                                                    const cur = parseFloat(inputValue) || 0;
                                                    const curMonthly = toMonthlyBasic(cur, salaryType, workFactor);
                                                    const r = deriveRates(curMonthly, workFactor);
                                                    const next = type === 'Monthly' ? r.monthlyBasic
                                                               : type === 'Daily'   ? r.dailyRate
                                                               : r.hourlyRate;
                                                    setInputValue(next.toFixed(4));
                                                    setSalaryType(type);
                                                }}
                                                className={`py-3 px-4 rounded-2xl border-2 font-bold transition-all ${
                                                    salaryType === type
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md'
                                                        : 'border-gray-100 text-gray-400 hover:border-indigo-200'
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Active rate input ───────────────────────── */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        Enter {salaryType} Rate
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-lg">₱</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            className="w-full pl-10 pr-6 py-4 border-2 border-indigo-400 bg-indigo-50/30 rounded-2xl outline-none font-mono font-black text-2xl text-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* ── Derived rate grid ───────────────────────── */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                        DOLE-Standard Rate Breakdown
                                        <span className="ml-2 text-indigo-400 normal-case">(4 decimal precision)</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Monthly Basic',  value: derivedRates.monthlyBasic, active: salaryType === 'Monthly', color: 'indigo'   },
                                            { label: 'Daily Rate',     value: derivedRates.dailyRate,    active: salaryType === 'Daily',   color: 'violet'   },
                                            { label: 'Hourly Rate',    value: derivedRates.hourlyRate,   active: salaryType === 'Hourly',  color: 'sky'      },
                                            { label: 'Per-Minute',     value: derivedRates.minuteRate,   active: false,                    color: 'emerald'  },
                                        ].map(({ label, value, active, color }) => (
                                            <div
                                                key={label}
                                                className={`rounded-2xl p-4 border-2 transition-all ${
                                                    active
                                                        ? `border-${color}-300 bg-${color}-50`
                                                        : 'border-slate-100 bg-slate-50/50'
                                                }`}
                                            >
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                                                <p className={`text-lg font-black tabular-nums font-mono ${active ? `text-${color}-600` : 'text-slate-600'}`}>
                                                    {formatPHP(value, 4)}
                                                </p>
                                                {active && (
                                                    <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">
                                                        Active type
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
                                        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                            <strong>Saved value:</strong> Monthly basic (₱{derivedRates.monthlyBasic.toFixed(2)}) is always stored as the canonical base.
                                            Rates shown are derived on-the-fly using the <strong>{workFactor}-day DOLE factor</strong>.
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Modal footer */}
                        <div className="p-6 border-t border-gray-100 bg-slate-50 flex gap-4 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setEditingEmployee(null)}
                                className="flex-1 py-3.5 px-6 border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="comp-form"
                                disabled={saving}
                                className="flex-[2] py-3.5 px-6 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : `Update Base Rate · ${formatPHP(derivedRates.monthlyBasic)}/mo`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Compensation;
