import React from 'react';

const Employees = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Employee Management</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">John Doe</td>
                            <td className="px-6 py-4">Engineering</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span></td>
                        </tr>
                        <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">Jane Smith</td>
                            <td className="px-6 py-4">HR</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Employees;
