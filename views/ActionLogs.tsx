'use client';

import React, { useState, useEffect } from 'react';

interface ActionLog {
    id: string;
    userId: string;
    action: string;
    description: string;
    createdAt: string;
    user?: {
        username: string;
        email: string;
    };
}

const ActionLogs = () => {
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/action-logs');
            const data = await res.json();
            
            if (Array.isArray(data)) {
                setLogs(data);
            } else {
                console.error('Failed to fetch logs:', data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
        setLoading(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (action.includes('UPDATE')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (action.includes('DELETE')) return 'bg-rose-100 text-rose-700 border-rose-200';
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    };

    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(term) ||
            log.description.toLowerCase().includes(term) ||
            (log.user?.username || '').toLowerCase().includes(term) ||
            (log.user?.email || '').toLowerCase().includes(term)
        );
    });

    const handleExportCSV = () => {
        if (logs.length === 0) return;

        const headers = ['Timestamp', 'Admin User', 'Email', 'Action', 'Description'];
        const csvRows = [headers.join(',')];

        filteredLogs.forEach(log => {
            const row = [
                `"${formatDate(log.createdAt)}"`,
                `"${log.user?.username || 'Unknown'}"`,
                `"${log.user?.email || log.userId}"`,
                `"${log.action}"`,
                `"${log.description.replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "action_logs_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Action Logs</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 cursor-text"
                        />
                    </div>
                    <button
                        onClick={handleExportCSV}
                        className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all font-semibold flex items-center gap-2"
                        title="Export to CSV"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all font-semibold flex items-center gap-2"
                    >
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">Timestamp</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">Admin User</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600">Action</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-600 w-1/2">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading logs...</td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No action logs found.</td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No logs match your search.</td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium whitespace-nowrap">
                                        {formatDate(log.createdAt)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{log.user?.username || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{log.user?.email || log.userId}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${getActionBadgeColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 truncate">
                                        {log.description}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActionLogs;
