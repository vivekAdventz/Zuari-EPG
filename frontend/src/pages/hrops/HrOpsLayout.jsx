import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HrOpsLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const isEmployee = user?.roles?.includes('employee');

    useEffect(() => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        const theme = localStorage.getItem('zuari-theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('zuari-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`bg-zuari-navy dark:bg-slate-950 text-white flex flex-col transition-all duration-300 shadow-xl z-50 fixed md:relative h-full border-r border-blue-800 dark:border-slate-800 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}`}>
                {/* Logo */}
                <div className="p-6 flex items-center justify-between border-b border-blue-800 dark:border-slate-800">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-zuari-navy to-blue-600 shadow-md flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">AskHR</h1>
                                <span className="text-[8px] font-bold text-blue-200 uppercase tracking-widest">HROps Portal</span>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto">
                            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-zuari-navy to-blue-600 shadow-md flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {/* Dashboard */}
                    <button
                        onClick={() => navigate('/hrops/dashboard')}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                            location.pathname === '/hrops/dashboard'
                                ? 'bg-blue-600 shadow-md text-white'
                                : 'text-blue-100 hover:bg-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        {isSidebarOpen && <span className="font-semibold text-sm">Dashboard</span>}
                    </button>

                    {/* Ticket Console */}
                    <button
                        onClick={() => navigate('/hrops/tickets')}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                            location.pathname === '/hrops/tickets'
                                ? 'bg-blue-600 shadow-md text-white'
                                : 'text-blue-100 hover:bg-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        {isSidebarOpen && <span className="font-semibold text-sm">Ticket Console</span>}
                    </button>
                </nav>

                {/* Footer */}
                <div className="p-4 bg-black/10 dark:bg-slate-800/30 border-t border-white/10 dark:border-slate-800 flex items-center gap-3 mt-auto flex-wrap">
                    {isSidebarOpen ? (
                        <>
                            <div className="flex-1 overflow-hidden order-1">
                                <button onClick={() => { logout(); navigate('/'); }} className="text-sm font-medium text-blue-100 hover:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    Sign Out
                                </button>
                            </div>
                            <button onClick={toggleDarkMode} className="p-2 ml-auto rounded-lg border border-white/20 dark:border-slate-700 hover:bg-white/20 dark:hover:bg-slate-700 transition-all text-white dark:text-gray-400 cursor-pointer order-2 shadow-md bg-white/10 dark:bg-slate-800 backdrop-blur-sm">
                                <svg className="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                                <svg className="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 w-full justify-center items-center">
                            <button onClick={toggleDarkMode} className="p-2 rounded-lg border border-white/20 dark:border-slate-700 hover:bg-white/20 dark:hover:bg-slate-700 transition-all text-white dark:text-gray-400 cursor-pointer shadow-md bg-white/10 dark:bg-slate-800 backdrop-blur-sm">
                                <svg className="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                                <svg className="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                            </button>
                            <button onClick={() => { logout(); navigate('/'); }} className="text-blue-100 hover:text-white flex items-center justify-center p-2 rounded-lg hover:bg-white/10" title="Sign Out">
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10 shrink-0">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </button>
                    <div className="flex items-center gap-3">
                        {/* Toggle button — visible when user also has employee role */}
                        {isEmployee && (
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
                                <button
                                    onClick={() => navigate('/chat')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-white dark:hover:bg-slate-600 transition-all"
                                    title="Switch to Employee View"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    <span className="hidden sm:inline">Employee</span>
                                </button>
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm cursor-default"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                    <span className="hidden sm:inline">HROps</span>
                                </button>
                            </div>
                        )}
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-800 dark:text-white">{user?.name}</div>
                            <div className="text-xs text-emerald-500 font-bold tracking-wider uppercase">HROps</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {user?.name?.charAt(0) || 'H'}
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-5">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default HrOpsLayout;
