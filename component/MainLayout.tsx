'use client';

import React, { useState } from 'react';
import SideNavbar from './SideNavbar';
import Dashboard from '../views/Dashboard';
import Employees from '../views/Employees';
import Payroll from '../views/Payroll';
import Settings from '../views/Settings';
import EmployeesList from '../views/EmployeesList';
import Overtime from '../views/Overtime';
import Leaves from '../views/Leaves';
import Schedules from '../views/Schedules';
import Holiday from '../views/Holiday';
import Users from '../views/Users';
import UserList from '../views/UserList';
import Roles from '../views/Roles';

interface MainLayoutProps {
    onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const renderView = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <Dashboard />;
            case 'Employees':
                return <Employees />;
            case 'Employees List':
                return <EmployeesList />;
            case 'Overtime':
                return <Overtime />;
            case 'Leaves':
                return <Leaves />;
            case 'Schedules':
                return <Schedules />;
            case 'Holiday':
                return <Holiday />;
            case 'Payroll':
                return <Payroll />;
            case 'Users':
                return <Users />;
            case 'User List':
                return <UserList />;
            case 'Roles & Permissions':
                return <Roles />;
            case 'Settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex overflow-hidden">
            <SideNavbar activeTab={activeTab} onTabChange={setActiveTab} isOpen={isSidebarOpen} onLogout={onLogout} />

            <main className={`flex-1 transition-all duration-500 ease-in-out min-h-screen ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all duration-300 shadow-sm"
                        >
                            <svg className={`w-6 h-6 transition-transform duration-500 ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isSidebarOpen ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h16M4 18h7"} />
                            </svg>
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">{activeTab}</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 border-l pl-6 border-gray-100">
                            <div className="flex flex-col items-end text-right">
                                <span className="text-sm font-bold text-gray-800">Admin</span>
                                <span className="text-[10px] text-gray-400 font-medium">Online</span>
                            </div>
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-inner ring-2 ring-indigo-50">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 p-2">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
