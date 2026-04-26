'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SideNavbarProps {
    activeTab: string;
    onTabChange?: (tab: string) => void;
    isOpen: boolean;
    onLogout: () => void;
    user?: any;
}

const SideNavbar: React.FC<SideNavbarProps> = ({ activeTab, onTabChange, isOpen, onLogout, user: propUser }) => {
    const [isUsersOpen, setIsUsersOpen] = useState(false);
    const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
    const [isTimeOpen, setIsTimeOpen] = useState(false);
    const [isFinanceOpen, setIsFinanceOpen] = useState(false);
    const [isEssOpen, setIsEssOpen] = useState(false);
    const [user, setUser] = useState<any>(undefined);

    useEffect(() => {
        if (propUser) {
            setUser(propUser);
            return;
        }

        const syncUser = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                setUser(userData);
            }
        };

        syncUser();

        window.addEventListener('userUpdate', syncUser);
        return () => window.removeEventListener('userUpdate', syncUser);
    }, [propUser]);

    const UNIFIED_MENU_ITEMS: {
        name: string;
        icon: string;
        hasSubLinks: boolean;
        isOpen: boolean;
        onToggle: () => void;
        subLinks: { name: string; path: string; module: string }[];
        path?: string;
    }[] = [
        {
            name: 'Administration',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            hasSubLinks: true,
            isOpen: isUsersOpen,
            onToggle: () => setIsUsersOpen(!isUsersOpen),
            subLinks: [
                { name: 'Dashboard', path: '/admin/dashboard', module: 'Dashboard (Admin)' },
                { name: 'User List', path: '/admin/users/list', module: 'User List' },
                { name: 'Roles & Permissions', path: '/admin/users/roles', module: 'Roles & Permissions' },
                { name: 'Branches', path: '/admin/branches', module: 'Branches' },
                { name: 'Action Logs', path: '/admin/logs', module: 'Action Logs' }
            ]
        },
        {
            name: 'Human Resources',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            hasSubLinks: true,
            isOpen: isEmployeesOpen,
            onToggle: () => setIsEmployeesOpen(!isEmployeesOpen),
            subLinks: [
                { name: 'Dashboard', path: '/dashboard', module: 'Dashboard (HR)' },
                { name: 'Employee List', path: '/employees', module: 'Employee List' },
                { name: 'Company Structure', path: '/structure', module: 'Company Structure' },
                { name: 'Benefits', path: '/benefits', module: 'Benefits' },
                { name: 'Holidays', path: '/holidays', module: 'Holidays' },
            ]
        },
        {
            name: 'Time & Attendance',
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            hasSubLinks: true,
            isOpen: isTimeOpen,
            onToggle: () => setIsTimeOpen(!isTimeOpen),
            subLinks: [
                { name: 'Daily Attendance', path: '/attendance', module: 'Daily Attendance' },
                { name: 'Daily Time Record', path: '/dtr', module: 'Daily Time Record (HR)' },
                { name: 'Schedules', path: '/schedule', module: 'Schedules' },
                { name: 'Time Requests', path: '/requests', module: 'Time Requests' }
            ]
        },
        {
            name: 'Finance & Accounting',
            icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
            hasSubLinks: true,
            isOpen: isFinanceOpen,
            onToggle: () => setIsFinanceOpen(!isFinanceOpen),
            subLinks: [
                { name: 'Dashboard', path: '/accounting/dashboard', module: 'Dashboard (Accounting)' },
                { name: 'Compensation', path: '/compensation', module: 'Compensation' },
                { name: 'Payroll', path: '/payroll', module: 'Payroll' },
                { name: 'Finance', path: '/accounting/finance', module: 'Finance'}
            ]
        },
        {
            name: 'Employee Self-Service',
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
            hasSubLinks: true,
            isOpen: isEssOpen,
            onToggle: () => setIsEssOpen(!isEssOpen),
            subLinks: [
                { name: 'My ESS', path: '/ess/dashboard', module: 'My ESS Portal' }
            ]
        }
    ];

    let menuItems: typeof UNIFIED_MENU_ITEMS = [];

    if (user) {
        const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
        const isSuperAdmin = roleName === 'Super Admin';
        const userPermissions: any[] = user.role?.permissions || [];

        menuItems = UNIFIED_MENU_ITEMS.map(category => {
            const filteredSubLinks = category.subLinks.filter(link => {
                if (isSuperAdmin) return true;
                const p = userPermissions.find((perm: any) => perm.module === link.module);
                return p ? p.canView : false;
            });

            return {
                ...category,
                subLinks: filteredSubLinks
            };
        }).filter(category => category.subLinks.length > 0);
    }

    // Hide sidebar content until we have hydration/role to prevent flashing wrong menu
    if (user === undefined) {
        return (
            <aside className={`w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50 transition-all duration-500 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            </aside>
        );
    }

    return (
        <aside className={`w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50 transition-all duration-500 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Logo Section */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex flex-col items-center justify-center pt-2 w-full text-center">
                    <Link href="/ess/dashboard" className="relative inline-block hover:scale-105 transition-transform duration-500">
                        <h1 className="text-6xl font-black italic tracking-tighter leading-none select-none text-center pr-2"
                            style={{
                                color: 'transparent',
                                backgroundImage: 'linear-gradient(to bottom, #00fff2 0%, #009a93 100%)',
                                WebkitBackgroundClip: 'text',
                                filter: 'drop-shadow(2px 4px 0px rgba(0,0,0,0.8)) drop-shadow(0 0 10px rgba(0,255,242,0.2))',
                                transform: 'skewX(-2deg)',
                                fontFamily: '"Arial Black", Gadget, sans-serif',
                                display: 'inline-block'
                            }}>
                            826
                        </h1>
                        <div className="w-full h-[2px] mt-1"
                            style={{
                                background: 'linear-gradient(to right, transparent, #c08d3c 20%, #f7e8a4 50%, #c08d3c 80%, transparent)'
                            }}
                        />
                        <p className="text-[7px] font-black text-white italic tracking-[0.1em] mt-1 text-center whitespace-nowrap uppercase">
                            Auto Aesthetic & Protection
                        </p>
                        <p className="text-[10px] text-teal-400 font-bold tracking-widest mt-1 uppercase">HRIS</p>
                    </Link>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar font-sans">
                {menuItems.map((item) => (
                    <div key={item.name}>
                        {item.hasSubLinks ? (
                            <div className="overflow-hidden">
                                <button
                                    onClick={item.onToggle}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${item.isOpen ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                        }`}
                                >
                                    <svg
                                        className={`w-5 h-5 transition-transform duration-300 ${item.isOpen ? 'text-indigo-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                                    </svg>
                                    <span className="font-semibold tracking-wide flex-1 text-left">{item.name}</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-500 ${item.isOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div
                                    className={`ml-9 space-y-1 transition-all duration-500 ease-in-out origin-top ${item.isOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    {item.subLinks?.map((sub) => (
                                        <button
                                            key={sub.name}
                                            onClick={() => onTabChange?.(sub.path)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${activeTab === sub.name
                                                ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeTab === sub.name ? 'bg-indigo-500 scale-125' : 'bg-slate-700'}`} />
                                            <span>{sub.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => onTabChange?.(item.path || '')}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === item.name
                                    ? 'bg-indigo-500/10 text-indigo-400 shadow-sm border border-indigo-500/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
                                    }`}
                            >
                                {activeTab === item.name && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                                )}
                                <svg
                                    className={`w-5 h-5 transition-transform duration-300 ${activeTab === item.name ? 'text-indigo-400 scale-110' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-110'
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                                </svg>
                                <span className="font-semibold tracking-wide">{item.name}</span>
                            </button>
                        )}
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 mt-auto font-sans">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => onTabChange?.('/admin/settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === 'Settings' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                            }`}
                    >
                        <svg className={`w-5 h-5 group-hover:scale-110 transition-transform ${activeTab === 'Settings' ? 'text-slate-300' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.5" />
                        </svg>
                        <span className="font-bold text-sm">Settings</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 group"
                    >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4-4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-bold text-sm">Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default SideNavbar;
