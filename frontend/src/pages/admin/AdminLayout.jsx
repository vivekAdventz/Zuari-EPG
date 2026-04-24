import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import minilogo from '../../assets/minilogo.png';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    useEffect(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
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

    const menuItems = [
        {
            path: '/admin/dashboard', label: 'Dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        },
        {
            path: '/admin/user-management', label: 'User Management', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            )
        },
        {
            path: '/admin/policies', label: 'Policy Hub', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )
        },
        {
            path: '/admin/config', label: 'Config', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            )
        },
        {
            path: '/admin/playground', label: '>_ Playground', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            )
        },
        { type: 'header', label: 'User Monitoring' },
        {
            path: '/admin/insights', label: 'Usage Insights', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            )
        },
        {
            path: '/admin/feedback-analysis', label: 'Feedback Analysis', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
            )
        },
        { type: 'header', label: 'HR Operations' },
        {
            path: '/admin/hrops-management', label: 'HROps Management', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            )
        },
        {
            path: '/admin/tickets', label: 'Ticket Monitor', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            )
        },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`bg-zuari-navy dark:bg-slate-950 text-white backdrop-blur-2xl border-r border-blue-800 dark:border-slate-800 flex flex-col transition-all duration-300 shadow-xl z-50 fixed md:relative h-full ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}`}>
                <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-zuari-navy to-blue-600 shadow-md shadow-blue-900/20 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">AskHR</h1>
                                <span className="text-[8px] font-bold text-blue-200 uppercase tracking-widest">Admin Panel</span>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto flex justify-center">
                            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-zuari-navy to-blue-600 shadow-md shadow-blue-900/20 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map((item, idx) => {
                        if (item.type === 'header') {
                            return isSidebarOpen ? (
                                <div key={idx} className="px-4 pt-6 pb-2 text-[10px] font-black text-blue-300/50 uppercase tracking-[0.2em] dark:text-slate-500">
                                    {item.label}
                                </div>
                            ) : (
                                <div key={idx} className="h-px bg-white/10 dark:bg-slate-800 my-4 mx-4"></div>
                            );
                        }
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${location.pathname === item.path ? 'bg-blue-600 shadow-md shadow-blue-900/40 text-white' : 'text-blue-100 hover:bg-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'}`}
                            >
                                <div className={`${location.pathname === item.path ? 'text-white' : 'text-blue-200 group-hover:text-white dark:text-slate-400 dark:group-hover:text-white'}`}>
                                    {item.icon}
                                </div>
                                {isSidebarOpen && <span className="font-semibold text-sm tracking-wide">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 bg-black/10 dark:bg-slate-800/30 border-t border-white/10 dark:border-slate-800 flex items-center gap-3 mt-auto flex-wrap">

                    {isSidebarOpen ? (
                        <>
                            <div className="flex-1 overflow-hidden order-1">
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-blue-100 hover:text-white flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                    Sign Out
                                </button>
                            </div>
                            <button onClick={toggleDarkMode} className="p-2 ml-auto rounded-lg border border-white/20 dark:border-slate-700 hover:bg-white/20 dark:hover:bg-slate-700 transition-all text-white dark:text-gray-400 cursor-pointer order-2 shadow-md bg-white/10 dark:bg-slate-800 backdrop-blur-sm">
                                <svg className="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>
                                <svg className="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 w-full justify-center items-center">
                            <button onClick={toggleDarkMode} className="p-2 rounded-lg border border-white/20 dark:border-slate-700 hover:bg-white/20 dark:hover:bg-slate-700 transition-all text-white dark:text-gray-400 cursor-pointer shadow-md bg-white/10 dark:bg-slate-800 backdrop-blur-sm">
                                <svg className="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>
                                <svg className="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>
                            </button>
                            <button
                                onClick={logout}
                                className="text-blue-100 hover:text-white flex items-center justify-center p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
                                title="Sign Out"
                            >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10 shrink-0">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Switch view — only for dual-role users */}
                        {user?.roles?.includes('employee') && (
                            <button
                                onClick={() => navigate('/chat')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-bold transition-all border border-blue-100 dark:border-blue-800"
                                title="Switch to Employee Dashboard"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                Employee View
                            </button>
                        )}

                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-800 dark:text-white">{user?.name}</div>
                            <div className="text-xs text-blue-500 font-bold tracking-wider uppercase">Administrator</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                            {user?.name?.charAt(0) || 'A'}
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

export default AdminLayout;
