import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getHrOpsStats, getAssignedTickets } from '../../api';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
    open:     { label: 'Open',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   dot: 'bg-blue-500' },
    hold:     { label: 'Hold',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
};

const StatusBadge = ({ status }) => {
    const m = STATUS_META[status] || STATUS_META.open;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${m.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
            {m.label}
        </span>
    );
};

const HrOpsOverview = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalThisWeek: 0, pending: 0, critical: 0, resolved: 0 });
    const [recentTickets, setRecentTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [statsRes, ticketsRes] = await Promise.all([
                    getHrOpsStats(),
                    getAssignedTickets({}),
                ]);
                setStats(statsRes);
                const all = ticketsRes.data || [];
                setRecentTickets(all.slice(0, 5));
            } catch (e) {
                toast.error(e.message || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ago`;
        if (h > 0) return `${h}h ago`;
        return 'Just now';
    };

    const statCards = [
        {
            label: 'This Week',
            value: stats.totalThisWeek,
            sub: 'Tickets assigned',
            color: 'from-blue-500 to-blue-600',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
        },
        {
            label: 'Pending',
            value: stats.pending,
            sub: 'Open + In Progress',
            color: 'from-amber-500 to-orange-500',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Critical',
            value: String(stats.critical).padStart(2, '0'),
            sub: 'Immediate attention',
            color: 'from-red-500 to-rose-600',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
        {
            label: 'Resolved',
            value: stats.resolved,
            sub: 'All time',
            color: 'from-emerald-500 to-teal-500',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-7 animate-up">

            {/* Welcome Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">
                        Welcome back, {user?.name?.split(' ')[0] || 'HROps'} 👋
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {stats.pending > 0
                            ? <span>You have <span className="text-amber-500 font-bold">{stats.pending} pending ticket{stats.pending > 1 ? 's' : ''}</span> awaiting your attention.</span>
                            : 'All tickets are up to date. Great work!'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/hrops/tickets')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Open Ticket Console
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading
                    ? [1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
                            <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded mb-3 w-1/2" />
                            <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded w-1/3" />
                        </div>
                    ))
                    : statCards.map((card) => (
                        <div
                            key={card.label}
                            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm p-5 group hover:shadow-md transition-shadow"
                        >
                            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-md mb-3`}>
                                {card.icon}
                            </div>
                            <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{card.label}</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{card.value}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
                        </div>
                    ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate('/hrops/tickets')}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 text-left transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white text-sm">Ticket Console</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">View and manage all assigned tickets</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 dark:text-slate-600 ml-auto group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {user?.roles?.includes('employee') && (
                        <button
                            onClick={() => navigate('/chat')}
                            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 text-left transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white text-sm">Switch to Employee View</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Access the employee chat portal</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300 dark:text-slate-600 ml-auto group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Tickets */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Recent Tickets</h2>
                    <button
                        onClick={() => navigate('/hrops/tickets')}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        View All →
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse flex gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-3/4" />
                                        <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recentTickets.length === 0 ? (
                        <div className="py-14 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 mx-auto mb-3 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400 dark:text-slate-500">No tickets assigned yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {recentTickets.map(ticket => (
                                <div
                                    key={ticket._id}
                                    onClick={() => navigate('/hrops/tickets')}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow">
                                        {ticket.userName?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">{ticket.ticketNumber}</span>
                                            <span className="text-gray-400 text-xs">·</span>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{ticket.userName}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                            {ticket.subject || ticket.description || ticket.userQuestion || '—'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <StatusBadge status={ticket.status} />
                                        <span className="text-xs text-gray-400 dark:text-slate-500 hidden sm:block">{timeAgo(ticket.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HrOpsOverview;
