'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';

// Explicitly define the interface according to the Prisma schema
interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;

    departmentId?: string;
    department?: { id: string; name: string } | null;
    positionId?: string;
    position?: { id: string; name: string } | null;
    dateHired?: string;
    status: string;
    pictureUrl?: string; // ADDED picture upload Url


    educationalDegree?: string;
    educationalInstitution?: string;
    yearGraduated?: string;

    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;

    branchId?: string;
    branch?: {
        id: string;
        name: string;
    } | null;
    salaryType?: string;
    baseSalary?: number;
}

const EmployeeList = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Default form data matching the schema
    const initialFormData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        departmentId: '',
        positionId: '',
        dateHired: '',
        status: 'active',
        educationalDegree: '',
        educationalInstitution: '',
        yearGraduated: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        branchId: '',
        pictureUrl: '',
        salaryType: 'Monthly',
        baseSalary: '0'
    };

    const [formData, setFormData] = useState(initialFormData);

    const [permissions, setPermissions] = useState({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
    });

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

                const empDataPerm = userObj.role?.permissions?.find((p: any) => p.module === 'Employee List');
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
            const [employeesRes, branchesRes, deptRes, posRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/branches'),
                fetch('/api/departments'),
                fetch('/api/positions')
            ]);

            const empData = await employeesRes.json();
            const branchData = await branchesRes.json();
            const deptData = await deptRes.json();
            const posData = await posRes.json();

            setEmployees(Array.isArray(empData) ? empData : []);
            setBranches(Array.isArray(branchData) ? branchData : []);
            setDepartments(Array.isArray(deptData) ? deptData : []);
            setPositions(Array.isArray(posData) ? posData : []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to format Date string to YYYY-MM-DD for input fields
    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    const handleOpenModal = (employee: Employee | null = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                phone: employee.phone || '',
                dateOfBirth: formatDateForInput(employee.dateOfBirth),
                gender: employee.gender || '',
                address: employee.address || '',
                departmentId: employee.departmentId || '',
                positionId: employee.positionId || '',
                dateHired: formatDateForInput(employee.dateHired),
                status: employee.status || 'active',
                educationalDegree: employee.educationalDegree || '',
                educationalInstitution: employee.educationalInstitution || '',
                yearGraduated: employee.yearGraduated || '',
                emergencyContactName: employee.emergencyContactName || '',
                emergencyContactPhone: employee.emergencyContactPhone || '',
                emergencyContactRelationship: employee.emergencyContactRelationship || '',
                branchId: employee.branchId ? employee.branchId.toString() : '',
                pictureUrl: employee.pictureUrl || '',
                salaryType: employee.salaryType || 'Monthly',
                baseSalary: employee.baseSalary?.toString() || '0'
            });
        } else {
            setEditingEmployee(null);
            setFormData(initialFormData);
        }
        setIsModalOpen(true);
    };

    const handleRowClick = (employee: Employee) => {
        setViewingEmployee(employee);
        setIsViewModalOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData,
            });

            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, pictureUrl: data.url }));
            } else {
                alert('Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('A network error occurred while uploading the image.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
        const method = editingEmployee ? 'PUT' : 'POST';

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
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || 'Failed to save employee'}`);
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('A network error occurred while saving the employee.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            try {
                const userStr = localStorage.getItem('user');
                const userObj = userStr ? JSON.parse(userStr) : null;
                const adminId = userObj?.id || '';

                await fetch(`/api/employees/${id}`, { 
                    method: 'DELETE',
                    headers: { 'x-admin-id': adminId }
                });
                fetchData();
            } catch (error) {
                console.error('Error deleting employee:', error);
            }
        }
    };

    // Helper to format date for table viewing
    const formatDateForTable = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // --- IMPORT / EXPORT LOGIC ---
    const handleExport = () => {
        if (employees.length === 0) {
            alert('No employees to export');
            return;
        }

        // Pick fields to export
        const exportData = employees.map(emp => ({
            ID: emp.id,
            FirstName: emp.firstName,
            LastName: emp.lastName,
            Email: emp.email,
            Phone: emp.phone || '',
            Position: emp.position?.name || '',
            Department: emp.department?.name || '',
            Status: emp.status,
            DateHired: formatDateForTable(emp.dateHired)
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'employees_export.csv');
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

                // Simple batch processing
                for (const row of rows) {
                    try {
                        // Map Department name to ID
                        const deptName = row.Department?.trim();
                        const matchedDept = deptName ? departments.find(d => d.name.toLowerCase() === deptName.toLowerCase()) : null;

                        // Map Position name to ID
                        const posName = row.Position?.trim();
                        const matchedPos = posName ? positions.find(p => p.name.toLowerCase() === posName.toLowerCase()) : null;

                        const payload = {
                            firstName: row.FirstName || 'Unknown',
                            lastName: row.LastName || 'Unknown',
                            email: row.Email || `temp-${Date.now()}@example.com`,
                            phone: row.Phone,
                            departmentId: matchedDept ? matchedDept.id : undefined,
                            positionId: matchedPos ? matchedPos.id : undefined,
                            status: row.Status || 'active'
                        };

                        const userStr = localStorage.getItem('user');
                        const userObj = userStr ? JSON.parse(userStr) : null;
                        const adminId = userObj?.id || '';

                        const res = await fetch('/api/employees', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'x-admin-id': adminId 
                            },
                            body: JSON.stringify(payload)
                        });

                        if (res.ok) successCount++;
                        else errorCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }

                alert(`Import Complete. Successfully imported ${successCount} employees. ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`);
                setIsImporting(false);
                fetchData(); // Refresh list
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            error: (error) => {
                alert(`Error parsing CSV: ${error.message}`);
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Employee Directory</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage human resources and personal information</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="bg-white border text-sm border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        {isImporting ? 'Importing...' : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Import CSV
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-white border text-sm border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-teal-600 text-white text-sm px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add Employee
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Position</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                {(permissions.canEdit || permissions.canDelete) && (
                                    <th className="px-6 py-4 text-xs font-bold text-right text-gray-500 uppercase tracking-wider">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                            Loading employee records...
                                        </div>
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            No employees found in the directory.
                                        </div>
                                    </td>
                                </tr>
                            ) : employees.map((employee) => (
                                <tr
                                    key={employee.id}
                                    onClick={() => handleRowClick(employee)}
                                    className="hover:bg-teal-50/30 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {employee.pictureUrl ? (
                                                <img src={employee.pictureUrl} alt={`${employee.firstName} ${employee.lastName}`} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                            ) : (
                                                <div className="shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center">
                                                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-gray-900">{employee.firstName} {employee.lastName}</div>
                                                <div className="text-xs text-gray-500">ID: EMP-{employee.id.slice(-6).toUpperCase()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700">{employee.email}</div>
                                        <div className="text-xs text-gray-500">{employee.phone || 'No phone'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-gray-800">{employee.position?.name || 'Unassigned'}</div>
                                        <div className="text-xs text-gray-500 mt-1">{employee.department?.name || 'No Dept'} • {employee.branch?.name || 'Global'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${employee.status === 'active' ? 'bg-green-100 text-green-700' :
                                            employee.status === 'resigned' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {employee.status}
                                        </span>
                                    </td>
                                    {(permissions.canEdit || permissions.canDelete) && (
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {permissions.canEdit && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(employee); }}
                                                    className="p-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all"
                                                    title="Edit Employee"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            )}
                                            {permissions.canDelete && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }}
                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete Employee"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Comprehensive HR Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* Header - Fixed top */}
                        <div className="shrink-0 p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl relative z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{editingEmployee ? 'Edit Employee Record' : 'New Employee Record'}</h2>
                                <p className="text-slate-500 text-sm mt-1">Fill in the comprehensive HR information below.</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto p-6 sm:p-8 flex-1 custom-scrollbar">
                            <form id="employee-form" onSubmit={handleSubmit} className="space-y-8">
                                {/* Section 1: Personal Information */}
                                <div>
                                    <h3 className="text-lg font-bold text-teal-700 border-b border-teal-100 pb-2 mb-4">Personal Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <div className="md:col-span-2 lg:col-span-3 flex items-start gap-6 border border-gray-100 p-4 rounded-xl bg-gray-50/50">
                                            <div className="shrink-0">
                                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm bg-gray-100 flex items-center justify-center relative group">
                                                    {formData.pictureUrl ? (
                                                        <img src={formData.pictureUrl} alt="Employee" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Profile Picture</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer"
                                                />
                                                <p className="mt-2 text-xs text-gray-500">JPG, PNG or GIF. 1MB max supported.</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">First Name *</label>
                                            <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Name *</label>
                                            <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date of Birth</label>
                                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gender</label>
                                            <select name="gender" value={formData.gender} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all appearance-none bg-white text-gray-900">
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other / Prefer not to say</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contact Information */}
                                <div>
                                    <h3 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-2 mb-4">Contact Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address *</label>
                                            <input type="email" name="email" required value={formData.email} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Physical Address</label>
                                            <textarea name="address" rows={2} value={formData.address} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none bg-white text-gray-900"></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Educational Background */}
                                <div>
                                    <h3 className="text-lg font-bold text-blue-700 border-b border-blue-100 pb-2 mb-4">Educational Background</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Degree / Attainment Level</label>
                                            <input type="text" name="educationalDegree" placeholder="e.g. BS Computer Science" value={formData.educationalDegree} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Institution / School</label>
                                            <input type="text" name="educationalInstitution" placeholder="e.g. University Name" value={formData.educationalInstitution} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Year Graduated</label>
                                            <input type="text" name="yearGraduated" placeholder="YYYY" value={formData.yearGraduated} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Employment Details */}
                                <div>
                                    <h3 className="text-lg font-bold text-amber-600 border-b border-amber-100 pb-2 mb-4">Employment Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status *</label>
                                            <select name="status" required value={formData.status} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all appearance-none bg-white text-gray-900">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="on-leave">On Leave</option>
                                                <option value="resigned">Resigned / Terminated</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                                            <select name="departmentId" value={formData.departmentId} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all appearance-none bg-white text-gray-900">
                                                <option value="">No Department</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Position / Job Title</label>
                                            <select name="positionId" value={formData.positionId} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all appearance-none bg-white text-gray-900">
                                                <option value="">No Position</option>
                                                {positions
                                                    // optionally filter by department if one is selected
                                                    .filter(pos => !formData.departmentId || pos.departmentId === formData.departmentId)
                                                    .map((pos) => (
                                                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date Hired</label>
                                            <input type="date" name="dateHired" value={formData.dateHired} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Branch</label>
                                            <select name="branchId" value={formData.branchId} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all appearance-none bg-white text-gray-900">
                                                <option value="">No Branch / Global</option>
                                                {branches.map((branch) => (
                                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>


                                {/* Section 5: Emergency Contact */}
                                <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100">
                                    <h3 className="text-lg font-bold text-rose-700 border-b border-rose-200 pb-2 mb-4">Emergency Contact</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Contact Name</label>
                                            <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-white focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none transition-all shadow-sm bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Relationship</label>
                                            <input type="text" name="emergencyContactRelationship" placeholder="e.g. Spouse, Parent" value={formData.emergencyContactRelationship} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-white focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none transition-all shadow-sm bg-white text-gray-900" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Contact Phone</label>
                                            <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-white focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none transition-all shadow-sm bg-white text-gray-900" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer - Fixed bottom */}
                        <div className="shrink-0 p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-2xl relative z-10">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="employee-form"
                                className="px-8 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                {editingEmployee ? '✓ Save Changes' : '+ Add Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* View Details Modal */}
            {isViewModalOpen && viewingEmployee && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200">

                        {/* Header */}
                        <div className="shrink-0 p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl relative z-10">
                            <div className="flex items-center gap-4">
                                {viewingEmployee.pictureUrl ? (
                                    <img src={viewingEmployee.pictureUrl} alt="Employee" className="w-16 h-16 rounded-full object-cover border-4 border-teal-50 shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 text-xl font-bold flex items-center justify-center shadow-sm">
                                        {viewingEmployee.firstName.charAt(0)}{viewingEmployee.lastName.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{viewingEmployee.firstName} {viewingEmployee.lastName}</h2>
                                    <p className="text-teal-600 font-medium text-sm mt-0.5">{viewingEmployee.position?.name || 'Unassigned Position'}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors self-start">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Scrollable Body - Read Only view */}
                        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar bg-slate-50/50">
                            <div className="space-y-6">

                                {/* Personal & Contact Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            Personal Info
                                        </h3>
                                        <dl className="space-y-3 text-sm">
                                            <div><dt className="text-gray-500 text-xs font-semibold">Employee ID</dt><dd className="font-medium text-gray-900 mt-0.5">EMP-{viewingEmployee.id.slice(-6).toUpperCase()}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Date of Birth</dt><dd className="font-medium text-gray-900 mt-0.5">{formatDateForTable(viewingEmployee.dateOfBirth)}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Gender</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.gender || 'Not specified'}</dd></div>
                                            <div className="pt-3 border-t border-gray-50">
                                                <dt className="text-gray-500 text-xs font-semibold">Status</dt>
                                                <dd className="mt-1.5">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${viewingEmployee.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        viewingEmployee.status === 'resigned' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {viewingEmployee.status}
                                                    </span>
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            Contact Details
                                        </h3>
                                        <dl className="space-y-3 text-sm">
                                            <div><dt className="text-gray-500 text-xs font-semibold">Email</dt><dd className="font-medium text-gray-900 mt-0.5"><a href={`mailto:${viewingEmployee.email}`} className="text-indigo-600 hover:underline">{viewingEmployee.email}</a></dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Phone</dt><dd className="font-medium text-gray-900 mt-0.5"><a href={`tel:${viewingEmployee.phone}`} className="text-indigo-600 hover:underline">{viewingEmployee.phone || 'N/A'}</a></dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Address</dt><dd className="font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{viewingEmployee.address || 'No address provided'}</dd></div>
                                        </dl>
                                    </div>
                                </div>

                                {/* Employment & Education Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            Employment
                                        </h3>
                                        <dl className="space-y-3 text-sm">
                                            <div><dt className="text-gray-500 text-xs font-semibold">Department</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.department?.name || 'N/A'}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Position</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.position?.name || 'N/A'}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Branch</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.branch?.name || 'Global / Headquarters'}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Date Hired</dt><dd className="font-medium text-gray-900 mt-0.5">{formatDateForTable(viewingEmployee.dateHired)}</dd></div>
                                        </dl>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
                                            Education
                                        </h3>
                                        <dl className="space-y-3 text-sm">
                                            <div><dt className="text-gray-500 text-xs font-semibold">Degree / Attainment</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.educationalDegree || 'N/A'}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Institution</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.educationalInstitution || 'N/A'}</dd></div>
                                            <div><dt className="text-gray-500 text-xs font-semibold">Year Graduated</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.yearGraduated || 'N/A'}</dd></div>
                                        </dl>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                        Emergency Contact
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                        <div><dt className="text-gray-500 text-xs font-semibold">Name</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.emergencyContactName || 'N/A'}</dd></div>
                                        <div><dt className="text-gray-500 text-xs font-semibold">Relationship</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.emergencyContactRelationship || 'N/A'}</dd></div>
                                        <div><dt className="text-gray-500 text-xs font-semibold">Phone</dt><dd className="font-medium text-gray-900 mt-0.5">{viewingEmployee.emergencyContactPhone || 'N/A'}</dd></div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-5 border-t border-gray-100 flex justify-end bg-white rounded-b-2xl relative z-10">
                            <button
                                type="button"
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;
