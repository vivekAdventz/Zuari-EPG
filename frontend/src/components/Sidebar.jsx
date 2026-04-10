
import React, { useState } from 'react';



const Sidebar = ({
    sessions,
    activeSessionId,
    user,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onLogout,
    isOpen,
    toggleSidebar,
    onOpenCalendar,
    toggleDarkMode,
    policies = [],
    selectedPolicyTitle,
    onSelectPolicy,
    onOpenPoliciesModal,
    onOpenTickets,
    currentView = 'chat',
}) => {
    const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);

    return (
        <aside
            id="mainSidebar"
            className={`w-64 bg-white/70 dark:bg-slate-950 backdrop-blur-2xl border-r border-gray-100 dark:border-slate-800 flex flex-col fixed inset-y-0 left-0 z-70 transition-transform duration-300 md:relative ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
            <div className="p-5">
                <div className="flex items-center gap-3 mb-6 px-1 pb-6 border-b border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-1">
                        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-zuari-navy to-blue-600 shadow-md shadow-blue-900/20 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white leading-none">AskHR</h1>
                            <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">AI Policy Assistant</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-zuari-navy rounded-xl text-sm font-bold text-white shadow shadow-blue-900/10 hover:bg-[#122856] transition-all group active:scale-[0.98]"
                >
                    <svg className="w-4 h-4 text-white/80 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                    New Discussion
                </button>

                {/* Tickets Section */}
                <button
                    onClick={onOpenTickets}
                    className={`w-full flex items-center gap-2.5 mt-3 py-2.5 px-3 rounded-xl text-sm font-bold transition-all group active:scale-[0.98] ${currentView === 'tickets' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 shadow-sm' : 'bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 border border-transparent'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                    Tickets
                </button>


            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar">
                <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.2em] mb-3">Recent Queries</h4>
                    <div className="space-y-1">
                        {sessions.length === 0 ? (
                            <div className="px-3 text-[11px] text-gray-500 dark:text-gray-400 italic">No recent history</div>
                        ) : (
                            sessions.slice(0, 5).map(session => (
                                <div
                                    key={session._id || session.id}
                                    onClick={() => onSelectSession(session._id || session.id)}
                                    className={`sidebar-item p-3 px-3 rounded-xl cursor-pointer flex items-center justify-between gap-2 group/item ${activeSessionId === (session._id || session.id) ? 'sidebar-active text-blue-700 dark:text-white bg-blue-50/80 dark:bg-slate-800' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <svg className={`w-3.5 h-3.5 shrink-0 ${activeSessionId === (session._id || session.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        <span className="text-[13px] font-semibold truncate">{session.title || 'New Conversation'}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteSession(session._id || session.id); }}
                                        className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-red-500 text-gray-400 transition-opacity"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <p className="px-3 text-[9px] text-gray-500 dark:text-gray-400 mt-4 leading-tight uppercase font-bold tracking-tighter opacity-70">
                    Note: Only the most recent 5 chats will be visible in history.
                </p>

                {/* Available Policies Section */}
                <div className="space-y-1 mt-6">
                    <div className="flex items-center justify-between px-3 mb-3">
                        <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.2em]">Available Policies</h4>
                        <button
                            onClick={onOpenPoliciesModal}
                            className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-600 dark:text-blue-400 p-1 rounded-md transition-colors"
                            title="View Policy Information"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                    </div>
                    <div className="space-y-1.5 px-2 pb-6">
                        {policies.length === 0 ? (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 italic px-1">No assigned policies found</div>
                        ) : (
                            policies.map(policy => {
                                const isSelected = selectedPolicyTitle === policy.title;
                                return (
                                    <label
                                        key={policy._id || policy.id}
                                        className={`flex flex-col p-2.5 rounded-xl transition-all duration-300 group cursor-pointer border 
                                            ${isSelected ? 'bg-blue-50/80 dark:bg-slate-800 border-blue-200 dark:border-blue-700/50 shadow-sm text-blue-800 dark:text-blue-100' : 'text-gray-700 dark:text-gray-200 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 dark:hover:bg-slate-800 dark:hover:shadow-black/20 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                                    >
                                        <div className={`flex items-start gap-3 transition-colors ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                                            <input
                                                type="radio"
                                                name="selectedPolicy"
                                                value={policy.title}
                                                checked={isSelected}
                                                onChange={() => onSelectPolicy(policy.title)}
                                                className="mt-[3px] shrink-0 w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                            />
                                            <span className="text-[13px] font-semibold leading-snug break-words line-clamp-2">{policy.title}</span>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-blue-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3 mt-auto">
                <div className="w-8 h-8 rounded-[10px] bg-zuari-navy flex items-center justify-center text-white text-[10px] font-bold">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'EU'}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-black truncate leading-tight text-gray-900 dark:text-white">{user?.name || 'Employee User'}</div>
                    <button onClick={onLogout} className="text-[10px] text-red-500 font-bold uppercase tracking-tighter hover:text-red-700">Log Out</button>
                </div>
                {/* Dark Mode Toggle */}
                <button onClick={toggleDarkMode} className="p-2 ml-auto rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-white/50 dark:hover:bg-slate-700 transition-all text-gray-400 hover:text-zuari-navy dark:hover:text-blue-400 cursor-pointer">
                    <svg id="sunIcon" className="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>
                    <svg id="moonIcon" className="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
