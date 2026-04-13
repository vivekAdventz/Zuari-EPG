import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getHrOpsStats, getAssignedTickets } from '../../api';
import TicketChatModal from '../../components/TicketChatModal';
import { FiMessageCircle } from 'react-icons/fi';
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
    const [stats, setStats] = useState({
        activeTickets: { value: 0, change: 0 },
        resolutionRate: { value: '0%', change: 0 },
        slaCompliance: { value: 0, change: 0 },
        backlog: { value: 0, change: 0 }
    });
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryPayload = { page, limit };
            if (statusFilter) queryPayload.status = statusFilter;

            const [statsRes, ticketsRes] = await Promise.all([
                getHrOpsStats(),
                getAssignedTickets(queryPayload),
            ]);
            setStats(statsRes);
            setTickets(ticketsRes.data || []);
            setTotalPages(ticketsRes.pages || 1);
        } catch (e) {
            toast.error(e.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    // Ensure we refetch when page or status filter changes
    useEffect(() => {
        fetchData();
    }, [statusFilter, page]);

    // Reset page to 1 when changing filters
    const handleFilterChange = (filter) => {
        setStatusFilter(filter);
        setPage(1);
    };

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
            label: 'Active Tickets',
            value: stats.activeTickets?.value || 0,
            change: stats.activeTickets?.change || 0,
            sub: 'Open + In Progress',
            color: 'from-blue-500 to-blue-600',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
        },
        {
            label: 'Avg Resolution',
            value: stats.resolutionRate?.value || '0%',
            change: stats.resolutionRate?.change || 0,
            sub: 'Resolved / Total',
            color: 'from-emerald-500 to-teal-500',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'SLA Failure',
            value: stats.slaCompliance?.value || 0,
            change: stats.slaCompliance?.change || 0,
            sub: 'Missed closure date',
            color: 'from-amber-500 to-orange-500',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Backlog',
            value: stats.backlog?.value || 0,
            change: stats.backlog?.change || 0,
            sub: 'Overdue active ones',
            color: 'from-red-500 to-rose-600',
            icon: (
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
    ];

    return (
        <>
            {selectedTicket && (
                <TicketChatModal
                    ticket={selectedTicket}
                    onClose={() => { setSelectedTicket(null); fetchData(); }}
                    userRole="hrOps"
                />
            )}

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
                <button onClick={fetchData} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-sm font-bold shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh
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
                            <p className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{card.value}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                {card.change !== 0 ? (
                                    <>
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${card.change > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">vs last week</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Stable vs last week</span>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 opacity-70 italic">{card.sub}</p>
                        </div>
                    ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {[['', 'All'], ['open', 'Open'], ['hold', 'Hold'], ['resolved', 'Resolved']].map(([val, label]) => (
                    <button
                        key={val}
                        onClick={() => handleFilterChange(val)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === val ? 'bg-zuari-navy text-white shadow' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Ticket ID</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Raised By</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Assigned To</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Subject</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Description</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Created</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Chat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}>
                                        {[1, 2, 3, 4, 5, 6].map(j => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="animate-pulse bg-gray-100 dark:bg-slate-700 rounded-lg h-4 w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-14 text-center text-gray-400 dark:text-slate-500">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 mx-auto mb-3 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        </div>
                                        No tickets found
                                    </td>
                                </tr>
                            ) : tickets.map(ticket => (
                                <tr
                                    key={ticket._id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="hover:bg-gray-50/70 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                                >
                                    <td className="px-5 py-4">
                                        <div className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">{ticket.ticketNumber}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(ticket.createdAt)}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-zuari-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {ticket.userName?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-800 dark:text-white text-xs">{ticket.userName}</div>
                                                <div className="text-[10px] text-gray-400">{ticket.userEntity || ticket.userEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg whitespace-nowrap">
                                            {ticket.themeName || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                {user?.name?.charAt(0) || 'H'}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{user?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="text-gray-700 dark:text-gray-300 text-xs font-bold">{ticket.subject || '—'}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="text-gray-700 dark:text-gray-300 text-xs">{ticket.description || ticket.userQuestion || '—'}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={ticket.status} />
                                    </td>
                                    <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="relative p-2 rounded-xl transition-all text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 cursor-pointer"
                                            title="Open Chat"
                                        >
                                            <FiMessageCircle size={20} />
                                            {ticket.unreadMessages > 0 && (
                                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white dark:border-slate-800">
                                                    {ticket.unreadMessages > 99 ? '99+' : ticket.unreadMessages}
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-[24px]">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Page <span className="text-gray-900 dark:text-white font-black">{page}</span> of {totalPages}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </>
    );
};

export default HrOpsOverview;