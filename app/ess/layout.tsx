'use client';

import React, { useState, useEffect } from 'react';
import SideNavbar from '@/component/SideNavbar';
import { useRouter, usePathname } from 'next/navigation';

export default function ESSLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState<{ username: string; email: string; role: any } | null>(null);
    const pathname = usePathname();

    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const syncUserAndCheckAuth = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                
                try {
                    // SERVER SYNC
                    const res = await fetch(`/api/users/${userData.id}`);
                    if (res.ok) {
                        const freshData = await res.json();
                        setUser(freshData);
                        localStorage.setItem('user', JSON.stringify(freshData));
                        
                        // Detect Standalone Mode (ESS only)
                        const roleName = freshData.role?.name;
                        if (roleName !== 'Super Admin') {
                            const permissions = freshData.role?.permissions || [];
                            const viewableModules = permissions.filter((p: any) => p.canView).map((p: any) => p.module);
                            
                            // If ONLY "My ESS Portal" or nothing else major is enabled
                            const onlyESS = viewableModules.length === 1 && viewableModules[0] === 'My ESS Portal';
                            setIsStandalone(onlyESS);
                        }
                    } else {
                        setUser(userData);
                    }
                } catch (error) {
                    console.error('Failed to sync user data:', error);
                    setUser(userData);
                }
            } else {
                router.push("/login");
            }
        };

        syncUserAndCheckAuth();
        window.addEventListener('userUpdate', syncUserAndCheckAuth);
        return () => window.removeEventListener('userUpdate', syncUserAndCheckAuth);
    }, [router]);

    // Map path to Display Name for the header
    const getPageTitle = () => {
        const path = pathname.split('/').pop() || 'Portal';
        if (path === 'dashboard') return 'MyESS Dashboard';
        return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        router.push("/login");
    };

    if (!user) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
            {!isStandalone && (
                <SideNavbar
                    activeTab={getPageTitle()}
                    onTabChange={(path) => {
                        router.push(path);
                    }}
                    isOpen={isSidebarOpen}
                    onLogout={handleLogout}
                    user={user}
                />
            )}

            <main className={`flex-1 transition-all duration-500 ease-in-out min-h-screen ${!isStandalone && isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        {!isStandalone ? (
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all duration-300 shadow-sm"
                            >
                                <svg className={`w-6 h-6 transition-transform duration-500 ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isSidebarOpen ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h16M4 18h7"} />
                                </svg>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 pr-4 border-r border-gray-100 mr-2">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <span className="text-white font-black text-xs leading-none">826</span>
                                </div>
                                <span className="font-black text-gray-900 tracking-tighter italic">HRIS<span className="text-indigo-600">.</span></span>
                            </div>
                        )}
                        <h2 className="text-xl font-black text-gray-900 tracking-tight tracking-tighter">{getPageTitle()}</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 border-l pl-6 border-gray-200">
                            <div className="flex flex-col items-end text-right">
                                <span className="text-sm font-bold text-gray-900">{user?.username}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{typeof user?.role === 'string' ? user.role : (user?.role?.name || 'Employee')}</span>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-inner border-2 border-indigo-100">
                                {user?.username?.charAt(0).toUpperCase() || 'E'}
                            </div>
                        </div>
                        {isStandalone && (
                            <button 
                                onClick={handleLogout}
                                className="ml-2 p-2.5 text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition-all duration-300"
                                title="Sign Out"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4-4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        )}
                    </div>
                </header>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
