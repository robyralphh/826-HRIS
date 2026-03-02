'use client';

import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                onLogin();
            } else {
                const data = await response.json();
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

            <div className="w-full max-w-md z-10">
                {/* Branding Section */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-block relative">
                        <h1 className="text-7xl font-black italic tracking-tighter leading-none select-none text-center"
                            style={{
                                color: 'transparent',
                                backgroundImage: 'linear-gradient(to bottom, #00fff2 0%, #009a93 100%)',
                                WebkitBackgroundClip: 'text',
                                filter: 'drop-shadow(3px 6px 0px rgba(0,0,0,0.8)) drop-shadow(0 0 15px rgba(0,255,242,0.3))',
                                transform: 'skewX(-2deg)',
                                fontFamily: '"Arial Black", Gadget, sans-serif'
                            }}>
                            826
                        </h1>
                        <div className="w-full h-[3px] mt-2"
                            style={{
                                background: 'linear-gradient(to right, transparent, #c08d3c 20%, #f7e8a4 50%, #c08d3c 80%, transparent)'
                            }}
                        />
                        <p className="text-[10px] font-black text-white italic tracking-[0.3em] mt-2 text-center whitespace-nowrap uppercase">
                            Auto Aesthetic & Protection
                        </p>
                    </div>
                </div>

                {/* Login Form Section */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-700">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white text-center">System Login</h2>
                        <p className="text-slate-400 text-sm text-center mt-2">Access the HRIS Dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 font-sans">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-sans"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider font-sans">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-teal-500 hover:text-teal-400 font-bold transition-colors">
                                    Forgot Password?
                                </a>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-sans"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-600 focus:ring-teal-500" />
                            <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">Remember this device</label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/20 transform hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <span>{isLoading ? 'Signing in...' : 'Sign in to Dashboard'}</span>
                            {!isLoading && (
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-slate-500 text-sm">
                    Protected by 826 Security Systems. © 2026
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
