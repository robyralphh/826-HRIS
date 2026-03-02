'use client';

import React from 'react';

const AttendanceLeaves = () => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Time & Attendance</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => alert("Attendance logs import will be implemented when the log data table is activated.")}
                        className="bg-white border text-sm border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Import Logs
                    </button>
                    <button
                        onClick={() => alert("Attendance logs export will be implemented when the log data table is activated.")}
                        className="bg-white border text-sm border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export Logs
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Attendance Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">Daily Attendance</h2>
                        <span className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">Monitor daily check-ins, check-outs, and tracking data.</p>
                    <button className="text-indigo-600 font-bold text-sm tracking-wide group-hover:underline">View Time Logs &rarr;</button>
                </div>

                {/* Leaves Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-teal-200 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800 group-hover:text-teal-600 transition-colors">Leave Requests</h2>
                        <span className="p-2 bg-teal-50 text-teal-500 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">Review pending leave applications and holiday balances.</p>
                    <button className="text-teal-600 font-bold text-sm tracking-wide group-hover:underline">Manage Leaves &rarr;</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {/* Future implementation: Combined Attendance and Leaves Data grid */}
                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <h3 className="text-lg font-bold text-gray-400">Activity Logs</h3>
                    <p className="text-sm text-gray-400 mt-1">Detailed attendance reporting to be populated.</p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceLeaves;
