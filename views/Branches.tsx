'use client';

import React, { useState, useEffect } from 'react';

interface Branch {
    id: string;
    name: string;
    location: string;
    status: string;
    _count?: {
        users: number;
    };
    biometricDevices?: any[];
}

const Branches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        status: 'active'
    });

    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [deviceFormData, setDeviceFormData] = useState({
        name: '',
        ip: '',
        port: '4370'
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [pingingDevices, setPingingDevices] = useState<Set<string>>(new Set());

    const [permissions, setPermissions] = useState({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

    useEffect(() => {
        fetchBranches();
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

                const empDataPerm = userObj.role?.permissions?.find((p: any) => p.module === 'Branches');
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

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/branches');
            const data = await res.json();
            if (Array.isArray(data)) {
                setBranches(data);
            } else {
                console.error('API returned non-array:', data);
                setBranches([]);
                if (data.error) alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            setBranches([]);
        }
        setLoading(false);
    };

    const handleOpenModal = (branch: Branch | null = null) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                location: branch.location || '',
                status: branch.status
            });
        } else {
            setEditingBranch(null);
            setFormData({
                name: '',
                location: '',
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleOpenDeviceModal = (branch: Branch) => {
        setSelectedBranch(branch);
        setDeviceFormData({ name: 'Main Lobby', ip: '', port: '4370' });
        setIsDeviceModalOpen(true);
    };

    const handleSyncBranch = async (branchId: string) => {
        setIsSyncing(true);
        try {
            const userStr = localStorage.getItem('user');
            const adminId = userStr ? JSON.parse(userStr).id : '';

            const res = await fetch('/api/hr/biometrics/sync', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify({ branchId })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Sync Summary:\n${data.results.map((r: any) => `- Device: ${r.deviceName}\n  Result: ${r.error ? `Error: ${r.error}` : `Success (${r.logsSynced} logs)`}`).join('\n')}`);
            } else {
                alert(`Sync Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error syncing branch:', error);
        } finally {
            setIsSyncing(false);
            fetchBranches();
        }
    };

    const handleAddDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBranch) return;

        try {
            const userStr = localStorage.getItem('user');
            const adminId = userStr ? JSON.parse(userStr).id : '';

            const res = await fetch('/api/hr/biometrics/devices', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify({
                    ...deviceFormData,
                    branchId: selectedBranch.id
                })
            });

            if (res.ok) {
                setIsDeviceModalOpen(false);
                fetchBranches();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error adding device:', error);
        }
    };

    const handleDeleteDevice = async (deviceId: string) => {
        if (!confirm('Are you sure you want to remove this biometric device?')) return;

        try {
            const userStr = localStorage.getItem('user');
            const adminId = userStr ? JSON.parse(userStr).id : '';

            const res = await fetch(`/api/hr/biometrics/devices/${deviceId}`, {
                method: 'DELETE',
                headers: { 'x-admin-id': adminId }
            });

            if (res.ok) {
                fetchBranches();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error deleting device:', error);
        }
    };

    const handlePingDevice = async (deviceId: string) => {
        setPingingDevices(prev => new Set(prev).add(deviceId));
        try {
            const res = await fetch(`/api/hr/biometrics/devices/${deviceId}/ping`);
            const data = await res.json();
            
            if (data.success) {
                // Refresh branches list to show updated status
                fetchBranches();
            } else {
                alert(`Ping Failed: ${data.error || 'Device unreachable'}`);
            }
        } catch (error) {
            console.error('Error pinging device:', error);
            alert('A network error occurred while testing the connection.');
        } finally {
            setPingingDevices(prev => {
                const next = new Set(prev);
                next.delete(deviceId);
                return next;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches';
        const method = editingBranch ? 'PUT' : 'POST';

        try {
            const storedUser = localStorage.getItem('user');
            const adminId = storedUser ? JSON.parse(storedUser).id : '';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchBranches();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || 'Failed to save branch'}`);
            }
        } catch (error) {
            console.error('Error saving branch:', error);
            alert('A network error occurred while saving the branch.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this branch?')) {
            try {
                const storedUser = localStorage.getItem('user');
                const adminId = storedUser ? JSON.parse(storedUser).id : '';

                const res = await fetch(`/api/branches/${id}`, { 
                    method: 'DELETE',
                    headers: { 'x-admin-id': adminId }
                });
                if (res.ok) {
                    fetchBranches();
                } else {
                    const error = await res.json();
                    alert(error.error);
                }
            } catch (error) {
                console.error('Error deleting branch:', error);
            }
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Branch Management</h1>
                {permissions.canCreate && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Branch
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">ID</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">Branch Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">Location</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">Status</th>
                            <th className="px-6 py-4 text-sm font-bold text-right text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading branches...</td>
                            </tr>
                        ) : branches.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No branches found.</td>
                            </tr>
                        ) : branches.map((branch) => (
                            <React.Fragment key={branch.id}>
                                <tr className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-400">#{branch.id}</td>
                                    <td className="px-6 py-4 font-semibold text-gray-900">{branch.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{branch.location || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${branch.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {branch.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenDeviceModal(branch)}
                                                className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                title="Add Biometric Device"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 004.5 12c0-5.523 4.477-10 10-10a9.96 9.96 0 018.008 4.02m-7.692 8.706L21 12m-3 0H3" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleSyncBranch(branch.id)}
                                                disabled={isSyncing}
                                                className={`p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all ${isSyncing ? 'animate-pulse' : ''}`}
                                                title="Sync Biometrics for this Branch"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(branch)}
                                                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Edit Branch"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(branch.id)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete Branch"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {branch.biometricDevices && branch.biometricDevices.length > 0 && (
                                        <tr className="bg-slate-50/30 border-b border-gray-50">
                                            <td colSpan={5} className="px-10 py-3">
                                                <div className="flex flex-wrap gap-4">
                                                    {branch.biometricDevices.map((dev: any) => (
                                                        <div key={dev.id} className="relative flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md group/dev">
                                                            <div className={`w-2.5 h-2.5 rounded-full ${dev.status === 'Active' ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-rose-500 shadow-lg shadow-rose-200'} ${pingingDevices.has(dev.id) ? 'animate-ping' : ''}`}></div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{dev.name}</span>
                                                                    <button 
                                                                        onClick={() => handlePingDevice(dev.id)}
                                                                        disabled={pingingDevices.has(dev.id)}
                                                                        className={`p-1 rounded-md hover:bg-slate-100 transition-colors text-slate-400 hover:text-indigo-600 ${pingingDevices.has(dev.id) ? 'animate-spin' : ''}`}
                                                                        title="Test Connection"
                                                                    >
                                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                                <span className="text-[9px] text-slate-400 font-mono font-bold">{dev.ip}:{dev.port}</span>
                                                            </div>
                                                            {dev.lastSync && (
                                                                <div className="ml-2 pl-3 border-l border-slate-100 flex flex-col">
                                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Last Sync</span>
                                                                    <span className="text-[9px] text-slate-500 font-bold">{new Date(dev.lastSync).toLocaleTimeString()}</span>
                                                                </div>
                                                            )}
                                                            <button 
                                                                onClick={() => handleDeleteDevice(dev.id)}
                                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/dev:opacity-100 transition-opacity shadow-sm hover:bg-rose-600 z-10"
                                                                title="Remove Device"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Branch Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="City or Address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                                <select
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white text-slate-900"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md mt-2 active:scale-[0.98]"
                            >
                                {editingBranch ? 'Save Changes' : 'Create Branch'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Device Modal */}
            {isDeviceModalOpen && selectedBranch && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Assign Biometric Device</h2>
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">Branch: {selectedBranch.name}</p>
                            </div>
                            <button onClick={() => setIsDeviceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddDevice} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Device Name / Location</label>
                                <input
                                    type="text" required placeholder="e.g. Main Lobby G2"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-bold"
                                    value={deviceFormData.name}
                                    onChange={(e) => setDeviceFormData({ ...deviceFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">IP Address</label>
                                    <input
                                        type="text" required placeholder="192.168.1.100"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-mono font-bold"
                                        value={deviceFormData.ip}
                                        onChange={(e) => setDeviceFormData({ ...deviceFormData, ip: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Port</label>
                                    <input
                                        type="number" required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-mono font-bold"
                                        value={deviceFormData.port}
                                        onChange={(e) => setDeviceFormData({ ...deviceFormData, port: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <p className="text-[10px] text-indigo-700 font-bold leading-relaxed italic">
                                    Note: Ensure port 4370 is open on the device and reachable from this server.
                                </p>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md mt-2 active:scale-[0.98]"
                            >
                                Register Device to Branch
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
