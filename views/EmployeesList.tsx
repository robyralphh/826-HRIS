import React from 'react';

const EmployeesList = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Employees List</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Employee ID</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Full Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Position</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">Joining Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-50">
                            <td className="px-6 py-4">EMP001</td>
                            <td className="px-6 py-4">John Doe</td>
                            <td className="px-6 py-4">Senior Developer</td>
                            <td className="px-6 py-4">2023-01-15</td>
                        </tr>
                        <tr className="border-b border-gray-50">
                            <td className="px-6 py-4">EMP002</td>
                            <td className="px-6 py-4">Jane Smith</td>
                            <td className="px-6 py-4">HR Manager</td>
                            <td className="px-6 py-4">2022-11-20</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeesList;
