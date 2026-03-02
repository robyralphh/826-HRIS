'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';

// Interfaces
interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    department?: { id: string; name: string } | null;
    position?: { id: string; name: string } | null;
    sssNumber: string | null;
    sssStatus: string;
    philHealthNumber: string | null;
    philHealthStatus: string;
    pagIbigNumber: string | null;
    pagIbigStatus: string;
    tinNumber: string | null;
    pictureUrl: string | null;
}

interface BenefitPlan {
    id: string;
    name: string;
    type: string;
    description: string | null;
}

interface EmployeeBenefit {
    id: string;
    benefitPlanId: string;
    status: string;
    benefitPlan: BenefitPlan;
}

const Benefits = () => {
    // State
    const [activeTab, setActiveTab] = useState<'mandated' | 'custom' | 'plans'>('mandated');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [benefitPlans, setBenefitPlans] = useState<BenefitPlan[]>([]);
    const [employeeBenefits, setEmployeeBenefits] = useState<EmployeeBenefit[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Import logic
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form inputs for new plans
    const [newPlanName, setNewPlanName] = useState('');
    const [newPlanType, setNewPlanType] = useState('Health');
    const [newPlanDesc, setNewPlanDesc] = useState('');

    useEffect(() => {
        fetchEmployees();
        fetchBenefitPlans();
    }, []);

    useEffect(() => {
        if (activeEmployee) {
            fetchEmployeeBenefits(activeEmployee.id);
        } else {
            setEmployeeBenefits([]);
        }
    }, [activeEmployee]);

    // Data Fetching
    const fetchEmployees = async () => {
        setLoading(true);
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

    const fetchBenefitPlans = async () => {
        try {
            const res = await fetch('/api/benefits');
            const data = await res.json();
            setBenefitPlans(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching benefit plans:', error);
        }
    };

    const fetchEmployeeBenefits = async (employeeId: string) => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/benefits`);
            const data = await res.json();
            setEmployeeBenefits(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching employee benefits:', error);
        }
    };

    // Actions
    const handleSaveMandated = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeEmployee) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/employees/${activeEmployee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sssNumber: activeEmployee.sssNumber,
                    sssStatus: activeEmployee.sssStatus,
                    philHealthNumber: activeEmployee.philHealthNumber,
                    philHealthStatus: activeEmployee.philHealthStatus,
                    pagIbigNumber: activeEmployee.pagIbigNumber,
                    pagIbigStatus: activeEmployee.pagIbigStatus,
                    tinNumber: activeEmployee.tinNumber,
                })
            });

            if (res.ok) {
                setEmployees(prev => prev.map(emp => emp.id === activeEmployee.id ? activeEmployee : emp));
                alert('Mandated benefits saved successfully!');
            } else {
                const error = await res.json();
                alert(`Error saving: ${error.error}`);
            }
        } catch (error) {
            console.error('Error saving benefits:', error);
            alert('Failed to save benefits information');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/benefits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPlanName,
                    type: newPlanType,
                    description: newPlanDesc
                })
            });
            if (res.ok) {
                setNewPlanName('');
                setNewPlanDesc('');
                fetchBenefitPlans();
                alert('Benefit Plan created!');
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to create plan');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('Are you sure you want to delete this master plan? This removes it for all employees.')) return;
        try {
            const res = await fetch(`/api/benefits/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBenefitPlans();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignBenefit = async (planId: string) => {
        if (!activeEmployee) return;
        try {
            const res = await fetch(`/api/employees/${activeEmployee.id}/benefits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ benefitPlanId: planId, status: 'Active' })
            });
            if (res.ok) fetchEmployeeBenefits(activeEmployee.id);
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveBenefit = async (employeeBenefitId: string) => {
        if (!activeEmployee || !confirm('Unassign this benefit from the employee?')) return;
        try {
            const res = await fetch(`/api/employees/${activeEmployee.id}/benefits?employeeBenefitId=${employeeBenefitId}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchEmployeeBenefits(activeEmployee.id);
        } catch (error) {
            console.error(error);
        }
    };

    // --- IMPORT / EXPORT MANDATED BENEFITS ---
    const handleExportMandated = () => {
        if (employees.length === 0) {
            alert('No employees to export');
            return;
        }

        const exportData = employees.map(emp => ({
            ID: emp.id,
            FirstName: emp.firstName,
            LastName: emp.lastName,
            SSS_Number: emp.sssNumber || '',
            SSS_Status: emp.sssStatus,
            PhilHealth_Number: emp.philHealthNumber || '',
            PhilHealth_Status: emp.philHealthStatus,
            PagIBIG_Number: emp.pagIbigNumber || '',
            PagIBIG_Status: emp.pagIbigStatus,
            TIN_Number: emp.tinNumber || ''
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'mandated_benefits_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as any[];
                let successCount = 0;
                let errorCount = 0;

                for (const row of rows) {
                    if (!row.ID) {
                        errorCount++;
                        continue;
                    }
                    try {
                        const payload = {
                            sssNumber: row.SSS_Number,
                            sssStatus: row.SSS_Status || 'Pending',
                            philHealthNumber: row.PhilHealth_Number,
                            philHealthStatus: row.PhilHealth_Status || 'Pending',
                            pagIbigNumber: row.PagIBIG_Number,
                            pagIbigStatus: row.PagIBIG_Status || 'Pending',
                            tinNumber: row.TIN_Number
                        };

                        const res = await fetch(`/api/employees/${row.ID}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        if (res.ok) successCount++;
                        else errorCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }

                alert(`Import Complete. Updated ${successCount} records. ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`);
                setIsImporting(false);
                fetchEmployees();
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            error: (error) => {
                alert(`Error parsing CSV: ${error.message}`);
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    // Components
    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            'Active': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
            'Exempt': 'bg-gray-100 text-gray-700 border-gray-200'
        }[status] || 'bg-slate-100 text-slate-700 border-slate-200';

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors}`}>
                {status}
            </span>
        );
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Sub-Views
    const renderMandatedTab = () => (
        <form onSubmit={handleSaveMandated} className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{activeEmployee?.firstName} {activeEmployee?.lastName}</h2>
                    <p className="text-gray-500 font-medium">{activeEmployee?.position?.name || 'No Position'} | {activeEmployee?.department?.name || 'No Department'}</p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                    >
                        {isImporting ? 'Importing...' : 'Import CSV'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExportMandated}
                        className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                    >
                        Export CSV
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
                {/* SSS */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <div className="flex justify-between items-center mb-4 ml-2">
                        <h3 className="font-bold text-gray-900">Social Security System (SSS)</h3>
                        <StatusBadge status={activeEmployee?.sssStatus || 'Pending'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 ml-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">SSS Number</label>
                            <input
                                type="text"
                                value={activeEmployee?.sssNumber || ''}
                                onChange={e => setActiveEmployee({ ...activeEmployee!, sssNumber: e.target.value })}
                                className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium placeholder-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Status</label>
                            <select
                                value={activeEmployee?.sssStatus}
                                onChange={e => setActiveEmployee({ ...activeEmployee!, sssStatus: e.target.value })}
                                className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                            >
                                <option>Pending</option><option>Active</option><option>Exempt</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* PhilHealth */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-center mb-4 ml-2">
                        <h3 className="font-bold text-gray-900">PhilHealth</h3>
                        <StatusBadge status={activeEmployee?.philHealthStatus || 'Pending'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 ml-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">PhilHealth Number</label>
                            <input
                                type="text"
                                value={activeEmployee?.philHealthNumber || ''}
                                onChange={e => setActiveEmployee({ ...activeEmployee!, philHealthNumber: e.target.value })}
                                className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium placeholder-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Status</label>
                            <select
                                value={activeEmployee?.philHealthStatus}
                                onChange={e => setActiveEmployee({ ...activeEmployee!, philHealthStatus: e.target.value })}
                                className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                            >
                                <option>Pending</option><option>Active</option><option>Exempt</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* PagIBIG */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                    <div className="flex justify-between items-center mb-4 ml-2">
                        <h3 className="font-bold text-gray-900">Pag-IBIG Fund</h3>
                        <StatusBadge status={activeEmployee?.pagIbigStatus || 'Pending'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 ml-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Pag-IBIG Number</label>
                            <input
                                type="text"
                                value={activeEmployee?.pagIbigNumber || ''}
                                onChange={e => setActiveEmployee({ ...activeEmployee!, pagIbigNumber: e.target.value })}
                                className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 font-medium placeholder-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Status</label>
                            <select
                                value={activeEmployee?.pagIbigStatus}
                                onChange={e => setActiveEmployee({ ...activeEmployee!, pagIbigStatus: e.target.value })}
                                className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 font-medium"
                            >
                                <option>Pending</option><option>Active</option><option>Exempt</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TIN */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                    <div className="flex justify-between items-center mb-4 ml-2">
                        <h3 className="font-bold text-gray-900">BIR TIN</h3>
                    </div>
                    <div className="w-1/2 ml-2 pr-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">TIN Number</label>
                        <input
                            type="text"
                            value={activeEmployee?.tinNumber || ''}
                            onChange={e => setActiveEmployee({ ...activeEmployee!, tinNumber: e.target.value })}
                            className="w-full px-4 py-2 mt-1 bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-slate-800 font-medium placeholder-gray-400"
                        />
                    </div>
                </div>

            </div>
        </form>
    );

    const renderCustomBenefitsTab = () => {
        // Find plans that the user does NOT have yet
        const unassignedPlans = benefitPlans.filter(bp => !employeeBenefits.some(eb => eb.benefitPlanId === bp.id));

        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-2xl font-black text-gray-900">{activeEmployee?.firstName}'s Custom Benefits</h2>
                    <p className="text-gray-500">Assign company perks and additional benefits.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Currently Enrolled */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Active Enrollments ({employeeBenefits.length})</h3>
                        {employeeBenefits.length === 0 ? (
                            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white text-gray-400">No custom benefits assigned.</div>
                        ) : (
                            <div className="space-y-3">
                                {employeeBenefits.map(eb => (
                                    <div key={eb.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{eb.benefitPlan.name}</h4>
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg">{eb.benefitPlan.type}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{eb.benefitPlan.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveBenefit(eb.id)}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Plans to Assign */}
                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Available Plans</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {unassignedPlans.map(plan => (
                                <div key={plan.id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm">
                                    <div className="mb-4">
                                        <h4 className="font-bold text-gray-900">{plan.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAssignBenefit(plan.id)}
                                        className="w-full py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Enroll Employee
                                    </button>
                                </div>
                            ))}
                            {unassignedPlans.length === 0 && (
                                <div className="col-span-2 text-center text-gray-400 text-sm py-4">All available plans have been assigned to this employee.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderManagePlansTab = () => (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="p-6 border-b border-gray-100 bg-white">
                <h2 className="text-2xl font-black text-gray-900">Master Benefit Plans</h2>
                <p className="text-gray-500">Create the benefit options that can be assigned to employees.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex gap-6">
                <div className="w-1/3">
                    <form onSubmit={handleCreatePlan} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-0">
                        <h3 className="font-bold text-lg mb-4">Create New Plan</h3>
                        <div className="space-y-4">
                            <div>
                                <input required type="text" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium" />
                            </div>
                            <div>
                                <select value={newPlanType} onChange={e => setNewPlanType(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium">
                                    <option>Health</option><option>Insurance</option><option>Allowance</option><option>Other</option>
                                </select>
                            </div>
                            <div>
                                <textarea value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-xl h-24 resize-none font-medium text-sm" />
                            </div>
                            <button disabled={isSaving} type="submit" className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl mt-2 hover:bg-slate-900 transition-colors">
                                {isSaving ? 'Creating...' : 'Create Plan'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="w-2/3 space-y-3">
                    {benefitPlans.map(plan => (
                        <div key={plan.id} className="bg-white p-5 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-bold text-gray-900 text-lg">{plan.name}</h4>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg">{plan.type}</span>
                                </div>
                                <p className="text-gray-500 text-sm">{plan.description}</p>
                            </div>
                            <button onClick={() => handleDeletePlan(plan.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                    {benefitPlans.length === 0 && (
                        <div className="text-center p-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white">No benefit plans created yet.</div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-8 h-screen overflow-hidden flex flex-col bg-slate-50">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Benefits Management</h1>
                    <p className="text-gray-500 mt-1">Manage mandated government contributions and custom company perks.</p>
                </div>

                {/* Global Tab Navigation */}
                <div className="flex bg-gray-200/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('mandated')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'mandated' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mandated Benefits
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'custom' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Custom Benefits
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'plans' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Manage Master Plans
                    </button>
                </div>
            </div>

            {activeTab === 'plans' ? (
                <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {renderManagePlansTab()}
                </div>
            ) : (
                <div className="flex gap-6 flex-1 min-h-0">
                    {/* Employee List Sidebar */}
                    <div className="w-1/3 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {loading ? (
                                <div className="p-8 text-center text-sm text-gray-400">Loading employees...</div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-400">No employees found.</div>
                            ) : (
                                filteredEmployees.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => setActiveEmployee(emp)}
                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeEmployee?.id === emp.id
                                            ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                                            : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        {emp.pictureUrl ? (
                                            <img src={emp.pictureUrl} alt={`${emp.firstName} ${emp.lastName}`} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white" />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 ${activeEmployee?.id === emp.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {emp.firstName[0]}{emp.lastName[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold truncate ${activeEmployee?.id === emp.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                {emp.firstName} {emp.lastName}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{emp.position?.name || 'No Position'} • {emp.department?.name || 'No Dept'}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Edit Form Area */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        {!activeEmployee ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border-8 border-white shadow-sm">
                                    <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Select an Employee</h2>
                                <p className="text-gray-500 max-w-sm">Choose an employee from the list to view and update their benefits.</p>
                            </div>
                        ) : (
                            activeTab === 'mandated' ? renderMandatedTab() : renderCustomBenefitsTab()
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Benefits;
