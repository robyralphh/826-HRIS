'use client';

import React, { useState, useEffect } from 'react';

interface Role {
    id: string;
    name: string;
    description: string;
    isManager: boolean;
    gracePeriodMinutes?: number;
    parentRoleId?: string | null;
    permissions: Permission[];
}

interface Permission {
    module: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

const MODULE_CATEGORIES: Record<string, string[]> = {
    'Administration': [
        'Dashboard (Admin)',
        'User List',
        'Roles & Permissions',
        'Branches',
        'Action Logs'
    ],
    'Human Resources': [
        'Dashboard (HR)',
        'Employee List',
        'Company Structure',
        'Benefits',
        'Daily Attendance',
        'Daily Time Record (HR)',
        'Schedules',
        'Time Requests'
    ],
    'Finance & Accounting': [
        'Dashboard (Accounting)',
        'Finance',
        'Payroll',
        'Compensation',
        'Expenses',
        'Loans',
        'Assets'
    ],
    'Employee Self-Service (ESS)': [
        'My ESS Portal'
    ]
};

const AVAILABLE_MODULES = Object.values(MODULE_CATEGORIES).flat();

const Roles = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isManager: false,
        gracePeriodMinutes: '0',
        parentRoleId: ''
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const [permissions, setPermissions] = useState({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

    useEffect(() => {
        fetchRoles();
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

                const userSettingsPerm = userObj.role?.permissions?.find((p: any) => p.module === 'User Settings');
                if (userSettingsPerm) {
                    setPermissions({
                        canView: userSettingsPerm.canView,
                        canCreate: userSettingsPerm.canCreate,
                        canEdit: userSettingsPerm.canEdit,
                        canDelete: userSettingsPerm.canDelete
                    });
                }
            }
        } catch (error) {
            console.error('Error loading permissions', error);
        }
    };

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/roles');
            const data = await res.json();
            if (!res.ok || !Array.isArray(data)) {
                console.error('Unexpected response from /api/roles:', data);
                setLoading(false);
                return;
            }
            setRoles(data);
            if (data.length > 0 && !activeRole) {
                setActiveRole(data[0]);
            } else if (activeRole) {
                const refreshed = data.find((r: Role) => r.id === activeRole.id);
                if (refreshed) setActiveRole(refreshed);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
        setLoading(false);
    };


    const handleOpenModal = (role: Role | null = null) => {
        if (role && role.name === 'Super Admin') return; // Prevent unlocking modal for Super Admin
        if (role) {
            setIsEditing(true);
            setFormData({ 
                name: role.name, 
                description: role.description || '', 
                isManager: !!role.isManager,
                gracePeriodMinutes: role.gracePeriodMinutes?.toString() || '0',
                parentRoleId: role.parentRoleId || ''
            });
        } else {
            setIsEditing(false);
            setFormData({ name: '', description: '', isManager: false, gracePeriodMinutes: '0', parentRoleId: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing ? `/api/roles/${activeRole?.id}` : '/api/roles';
        const method = isEditing ? 'PUT' : 'POST';

        const defaultPermissions = AVAILABLE_MODULES.map(moduleName => ({
            module: moduleName,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false
        }));

        try {
            const storedUser = localStorage.getItem('user');
            const adminId = storedUser ? JSON.parse(storedUser).id : '';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify({
                    ...formData,
                    permissions: isEditing ? activeRole?.permissions : defaultPermissions
                }),
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchRoles();
            }
        } catch (error) {
            console.error('Error saving role:', error);
        }
    };

    const handlePermissionChange = async (module: string, action: string, value: boolean) => {
        if (!activeRole || activeRole.name === 'Super Admin') return;

        let updatedPermissions = [...activeRole.permissions];
        const existingPermIndex = updatedPermissions.findIndex(p => p.module === module);
        
        if (existingPermIndex >= 0) {
            updatedPermissions[existingPermIndex] = { ...updatedPermissions[existingPermIndex], [action]: value };
        } else {
            // Permission record didn't exist in DB yet, create it
            updatedPermissions.push({
                module: module,
                canView: action === 'canView' ? value : false,
                canCreate: action === 'canCreate' ? value : false,
                canEdit: action === 'canEdit' ? value : false,
                canDelete: action === 'canDelete' ? value : false
            });
        }

        const updatedRole = { ...activeRole, permissions: updatedPermissions };
        setActiveRole(updatedRole);
        setSaveStatus('saving');

        // Auto-save permission change
        try {
            const storedUser = localStorage.getItem('user');
            const adminId = storedUser ? JSON.parse(storedUser).id : '';

            const res = await fetch(`/api/roles/${activeRole.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify({
                    name: activeRole.name,
                    description: activeRole.description,
                    isManager: activeRole.isManager,
                    permissions: updatedPermissions
                }),
            });
            if (res.ok) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
                // Update the roles list too
                setRoles(prev => prev.map(r => r.id === activeRole.id ? updatedRole : r));

                // Sync localStorage if it's the current user's role
                if (storedUser) {
                    const currentUser = JSON.parse(storedUser);
                    if (currentUser.role?.id === activeRole.id) {
                        localStorage.setItem('user', JSON.stringify({
                            ...currentUser,
                            role: updatedRole
                        }));
                        window.dispatchEvent(new CustomEvent('userUpdate'));
                    }
                }
            } else {
                setSaveStatus('idle');
            }
        } catch (error) {
            console.error('Error auto-saving permissions:', error);
            setSaveStatus('idle');
        }
    };

    const handleDelete = async (id: string) => {
        const roleToDelete = roles.find(r => r.id === id);
        if (roleToDelete?.name === 'Super Admin') {
            alert('The Super Admin role cannot be deleted.');
            return;
        }

        if (confirm('Are you sure you want to delete this role?')) {
            try {
                const storedUser = localStorage.getItem('user');
                const adminId = storedUser ? JSON.parse(storedUser).id : '';

                const res = await fetch(`/api/roles/${id}`, { 
                    method: 'DELETE',
                    headers: { 'x-admin-id': adminId }
                });
                if (!res.ok) {
                    const error = await res.json();
                    alert(error.error);
                } else {
                    fetchRoles();
                }
            } catch (error) {
                console.error('Error deleting role:', error);
            }
        }
    };

    const sortedRoles: Role[] = [];
    const superAdmin = roles.find(r => r.name === 'Super Admin');
    if (superAdmin) sortedRoles.push(superAdmin);

    const otherParents = roles.filter(r => r.name !== 'Super Admin' && !r.parentRoleId);
    otherParents.forEach(parent => {
        sortedRoles.push(parent);
        const children = roles.filter(r => r.parentRoleId === parent.id);
        sortedRoles.push(...children);
    });

    // Catch any orphaned roles just in case
    const orphaned = roles.filter(r => r.name !== 'Super Admin' && r.parentRoleId && !roles.some(p => p.id === r.parentRoleId));
    sortedRoles.push(...orphaned);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Roles & Permissions</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {loading ? (
                    <div className="col-span-3 text-center py-8 text-gray-400">Loading roles...</div>
                ) : (
                    <>
                        {sortedRoles.map((role) => {
                            const parentRole = role.parentRoleId ? roles.find(r => r.id === role.parentRoleId) : null;
                            return (
                            <div
                                key={role.id}
                                onClick={() => setActiveRole(role)}
                                className={`bg-white p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group ${activeRole?.id === role.id ? 'border-indigo-500 shadow-md scale-[1.02]' : 'border-gray-100 hover:border-indigo-200 shadow-sm'
                                    }`}
                            >
                                {role.name !== 'Super Admin' && (permissions.canEdit || permissions.canDelete) && (
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity space-x-2 flex">
                                        {permissions.canEdit && (
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenModal(role); }} className="p-1.5 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-lg">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        )}
                                        {permissions.canDelete && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }} className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 rounded-lg">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                                <h3 className={`text-xl font-bold mb-1 transition-colors ${activeRole?.id === role.id ? 'text-indigo-600' : 'text-gray-800'}`}>
                                    {role.name}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">{role.description || 'No description'}</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Active Role</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 ml-1"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter ml-1">Grace Period: {role.gracePeriodMinutes || 0}m</span>
                                    {role.isManager && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 ml-1"></span>
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter ml-1">Manager</span>
                                        </>
                                    )}
                                </div>
                                {parentRole && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-tighter">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                                        Reports to {parentRole.name}
                                    </div>
                                )}
                            </div>
                            )
                        })}

                        {permissions.canCreate && (
                            <div
                                onClick={() => handleOpenModal()}
                                className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/10 transition-all cursor-pointer"
                            >
                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="font-bold">Add New Role</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {activeRole && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900 text-lg">
                            Permission Matrix: <span className="text-indigo-600">{activeRole.name}</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            {saveStatus === 'saving' && (
                                <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold animate-pulse">
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Saving changes...
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    Changes saved
                                </span>
                            )}
                            {saveStatus === 'idle' && (
                                <span className="text-[10px] text-gray-500 font-medium italic">Changes are saved automatically</span>
                            )}
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-black text-gray-900">Module</th>
                                <th className="px-6 py-4 text-sm font-black text-center text-gray-900">View</th>
                                <th className="px-6 py-4 text-sm font-black text-center text-gray-900">Create</th>
                                <th className="px-6 py-4 text-sm font-black text-center text-gray-900">Edit</th>
                                <th className="px-6 py-4 text-sm font-black text-center text-gray-900">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {Object.entries(MODULE_CATEGORIES).map(([category, modules]) => (
                                <React.Fragment key={category}>
                                    <tr className="bg-gray-100/80">
                                        <td colSpan={5} className="px-6 py-2.5 text-xs font-black text-gray-800 uppercase tracking-wider">{category}</td>
                                    </tr>
                                    {modules.map((moduleName) => {
                                        const p = activeRole.permissions.find(perm => perm.module === moduleName) || {
                                            module: moduleName,
                                            canView: false,
                                            canCreate: false,
                                            canEdit: false,
                                            canDelete: false
                                        };
                                        return (
                                        <tr key={moduleName} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-gray-700">{moduleName}</td>
                                            {['canView', 'canCreate', 'canEdit', 'canDelete'].map((action) => {
                                                const isChecked = activeRole.name === 'Super Admin' ? true : (p[action as keyof Permission] as boolean ?? false);
                                                const isDisabled = activeRole.name === 'Super Admin' || !permissions.canEdit;
                                                
                                                return (
                                                <td key={action} className="px-6 py-4 text-center">
                                                    <label className={`relative inline-flex items-center ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} group`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={isDisabled}
                                                            onChange={(e) => handlePermissionChange(moduleName, action, e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDisabled && isChecked ? 'bg-indigo-400 after:translate-x-full after:border-white border-transparent' : 'peer-checked:bg-indigo-600'}`}></div>
                                                    </label>
                                                </td>
                                                )
                                            })}
                                        </tr>
                                        )
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Role Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Role' : 'Add New Role'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Role Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 font-bold"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none text-gray-900 font-bold"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            {!formData.isManager && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Parent Role (Optional)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 font-bold bg-white"
                                    value={formData.parentRoleId}
                                    onChange={(e) => setFormData({ ...formData, parentRoleId: e.target.value })}
                                >
                                    <option value="">-- No Parent Role --</option>
                                    {roles.filter(r => r.name !== 'Super Admin' && r.id !== activeRole?.id).map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            )}
                            <div className="flex items-center gap-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
                                <label className="relative inline-flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.isManager}
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            isManager: e.target.checked,
                                            parentRoleId: e.target.checked ? '' : formData.parentRoleId 
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                                <div>
                                    <span className="block text-sm font-bold text-indigo-900">Manager Position</span>
                                    <span className="block text-xs text-indigo-700/70 leading-tight">Elevates role to managerial authority in hierarchy chains</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Grace Period (Minutes)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 font-bold"
                                    value={formData.gracePeriodMinutes}
                                    onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: e.target.value })}
                                />
                                <span className="block text-xs text-gray-500 mt-1 leading-tight">Minutes allowed before a late deduction is triggered for this role.</span>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md mt-2"
                            >
                                {isEditing ? 'Save Changes' : 'Create Role'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Roles;
