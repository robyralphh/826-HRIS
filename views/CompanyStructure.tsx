'use client';

import React, { useState, useEffect } from 'react';

interface Department {
    id: string;
    name: string;
    description: string | null;
    status: string;
    _count: { employees: number, positions: number };
    employees?: { id: string, firstName: string, lastName: string, email: string, position?: { name: string } | null }[];
}

interface Position {
    id: string;
    name: string;
    description: string | null;
    status: string;
    departmentId: string | null;
    department?: Department | null;
    _count: { employees: number };
    employees?: { id: string, firstName: string, lastName: string, email: string, department?: { name: string } | null }[];
}

const CompanyStructure = () => {
    const [activeTab, setActiveTab] = useState<'departments' | 'positions'>('departments');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewModalData, setViewModalData] = useState<{ title: string, employees: any[] } | null>(null);

    // Permission States
    const [permissions, setPermissions] = useState({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

    // Form States
    const [isSaving, setIsSaving] = useState(false);

    // Department Form
    const [deptId, setDeptId] = useState('');
    const [deptName, setDeptName] = useState('');
    const [deptDesc, setDeptDesc] = useState('');
    const [deptStatus, setDeptStatus] = useState('active');

    // Position Form
    const [posId, setPosId] = useState('');
    const [posName, setPosName] = useState('');
    const [posDesc, setPosDesc] = useState('');
    const [posDepartmentId, setPosDepartmentId] = useState('');
    const [posStatus, setPosStatus] = useState('active');

    useEffect(() => {
        fetchData();
        loadPermissions();
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

                const empDataPerm = userObj.role?.permissions?.find((p: any) => p.module === 'Company Structure');
                if (empDataPerm) {
                    setPermissions({
                        canView: empDataPerm.canView,
                        canCreate: empDataPerm.canCreate,
                        canEdit: empDataPerm.canEdit,
                        canDelete: empDataPerm.canDelete
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
            const [deptRes, posRes] = await Promise.all([
                fetch('/api/departments'),
                fetch('/api/positions')
            ]);

            setDepartments(await deptRes.json());
            setPositions(await posRes.json());
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Department Actions ---
    const resetDeptForm = () => {
        setDeptId(''); setDeptName(''); setDeptDesc(''); setDeptStatus('active');
    };

    const handleEditDept = (dept: Department) => {
        setDeptId(dept.id);
        setDeptName(dept.name);
        setDeptDesc(dept.description || '');
        setDeptStatus(dept.status);
    };

    const handleSaveDept = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const url = deptId ? `/api/departments/${deptId}` : '/api/departments';
        const method = deptId ? 'PUT' : 'POST';

        try {
            const userStr = localStorage.getItem('user');
            const userObj = userStr ? JSON.parse(userStr) : null;
            const adminId = userObj?.id || '';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify({ name: deptName, description: deptDesc, status: deptStatus })
            });
            if (res.ok) {
                resetDeptForm();
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save department');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDept = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            const userStr = localStorage.getItem('user');
            const userObj = userStr ? JSON.parse(userStr) : null;
            const adminId = userObj?.id || '';

            const res = await fetch(`/api/departments/${id}`, { 
                method: 'DELETE',
                headers: { 'x-admin-id': adminId }
            });
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- Position Actions ---
    const resetPosForm = () => {
        setPosId(''); setPosName(''); setPosDesc(''); setPosDepartmentId(''); setPosStatus('active');
    };

    const handleEditPos = (pos: Position) => {
        setPosId(pos.id);
        setPosName(pos.name);
        setPosDesc(pos.description || '');
        setPosDepartmentId(pos.departmentId || '');
        setPosStatus(pos.status);
    };

    const handleSavePos = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const url = posId ? `/api/positions/${posId}` : '/api/positions';
        const method = posId ? 'PUT' : 'POST';

        try {
            const userStr = localStorage.getItem('user');
            const userObj = userStr ? JSON.parse(userStr) : null;
            const adminId = userObj?.id || '';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify({
                    name: posName,
                    description: posDesc,
                    departmentId: posDepartmentId || null,
                    status: posStatus
                })
            });
            if (res.ok) {
                resetPosForm();
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save position');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePos = async (id: string) => {
        if (!confirm('Are you sure you want to delete this position?')) return;
        try {
            const userStr = localStorage.getItem('user');
            const userObj = userStr ? JSON.parse(userStr) : null;
            const adminId = userObj?.id || '';

            const res = await fetch(`/api/positions/${id}`, { 
                method: 'DELETE',
                headers: { 'x-admin-id': adminId }
            });
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Company Structure</h1>
                <p className="text-slate-500 text-sm mt-1">Manage organizational departments and job positions</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'departments' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Departments
                </button>
                <button
                    onClick={() => setActiveTab('positions')}
                    className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'positions' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Job Positions
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Left side: List */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Name</th>
                                        {activeTab === 'positions' && (
                                            <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Department</th>
                                        )}
                                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Employees</th>
                                        {(permissions.canEdit || permissions.canDelete) && (
                                            <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {activeTab === 'departments' ? (
                                        departments.map(dept => (
                                            <tr key={dept.id} onClick={() => setViewModalData({ title: dept.name, employees: dept.employees || [] })} className="cursor-pointer hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{dept.name}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{dept.description || 'No description'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${dept.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {dept.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                                                    {dept._count.employees}
                                                </td>
                                                {(permissions.canEdit || permissions.canDelete) && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {permissions.canEdit && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleEditDept(dept); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                        )}
                                                        {permissions.canDelete && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDept(dept.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        positions.map(pos => (
                                            <tr key={pos.id} onClick={() => setViewModalData({ title: pos.name, employees: pos.employees || [] })} className="cursor-pointer hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{pos.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-700">{pos.department?.name || 'Unassigned'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${pos.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {pos.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                                                    {pos._count.employees}
                                                </td>
                                                {(permissions.canEdit || permissions.canDelete) && (
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {permissions.canEdit && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleEditPos(pos); }} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                        )}
                                                        {permissions.canDelete && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeletePos(pos.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    {(activeTab === 'departments' ? departments : positions).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">No records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right side: Form (Only if they can Create or Edit) */}
                    {(permissions.canCreate || permissions.canEdit) && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
                                {activeTab === 'departments'
                                    ? (deptId ? 'Edit Department' : 'Create Department')
                                    : (posId ? 'Edit Position' : 'Create Position')}
                            </h2>

                            {activeTab === 'departments' ? (
                                <form onSubmit={handleSaveDept} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department Name *</label>
                                        <input required type="text" value={deptName} onChange={e => setDeptName(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                                        <select value={deptStatus} onChange={e => setDeptStatus(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium bg-white">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                                        <textarea value={deptDesc} onChange={e => setDeptDesc(e.target.value)} rows={3}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 resize-none font-medium text-sm"></textarea>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        {deptId && <button type="button" onClick={resetDeptForm} className="px-4 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>}
                                        <button disabled={isSaving} type="submit" className="flex-1 px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm">
                                            {isSaving ? 'Saving...' : 'Save Department'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleSavePos} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Position Title *</label>
                                        <input required type="text" value={posName} onChange={e => setPosName(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assign to Department</label>
                                        <select value={posDepartmentId} onChange={e => setPosDepartmentId(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium bg-white">
                                            <option value="">-- No Department --</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                                        <select value={posStatus} onChange={e => setPosStatus(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium bg-white">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        {posId && <button type="button" onClick={resetPosForm} className="px-4 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>}
                                        <button disabled={isSaving} type="submit" className="flex-1 px-4 py-2.5 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm">
                                            {isSaving ? 'Saving...' : 'Save Position'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Employees Modal */}
            {viewModalData && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Employees in {viewModalData.title}</h3>
                                <p className="text-sm text-slate-500 mt-1">{viewModalData.employees.length} team members</p>
                            </div>
                            <button onClick={() => setViewModalData(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {viewModalData.employees.length === 0 ? (
                                <div className="text-center p-12 text-slate-400 font-medium">No employees found.</div>
                            ) : (
                                <div className="space-y-2">
                                    {viewModalData.employees.map(emp => (
                                        <div key={emp.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</span>
                                                <span className="text-xs text-slate-500">{emp.email}</span>
                                            </div>
                                            <div className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                                                {emp.position?.name || emp.department?.name || 'Unassigned'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyStructure;
