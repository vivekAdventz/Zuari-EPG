import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiMessageCircle } from 'react-icons/fi';
import {
    getHrOpsStats, getAssignedTickets,
} from '../../api';
import TicketChatModal from '../../components/TicketChatModal';

const STATUS_META = {
    open:         { label: 'Open',        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    'hold':       { label: 'Hold',        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    resolved:     { label: 'Resolved',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const StatusBadge = ({ status }) => {
    const m = STATUS_META[status] || STATUS_META.open;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${m.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'resolved' ? 'bg-green-500' : status === 'hold' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            {m.label}
        </span>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const HrOpsDashboard = () => {
    const [stats, setStats] = useState({ totalThisWeek: 0, pending: 0, critical: 0, resolved: 0 });
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, ticketsRes] = await Promise.all([
                getHrOpsStats(),
                getAssignedTickets(statusFilter ? { status: statusFilter } : {}),
            ]);
            setStats(statsRes);
            setTickets(ticketsRes.data || []);
        } catch (e) {
            toast.error(e.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [statusFilter]);

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ago`;
        if (h > 0) return `${h}h ago`;
        return 'Just now';
    };

    return (
        <>
            {/* Modal rendered outside animate-up to avoid transform stacking context breaking fixed positioning */}
            {selectedTicket && (
                <TicketChatModal
                    ticket={selectedTicket}
                    onClose={() => { setSelectedTicket(null); fetchData(); }}
                    userRole="hrOps"
                />
            )}

        <div className="space-y-6 animate-up">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Ticket Console</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {stats.pending > 0
                            ? <span><span className="text-blue-600 font-bold">{stats.pending} Pending Tickets</span> requiring your attention</span>
                            : 'All caught up!'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">This Week</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalThisWeek}</p>
                    <p className="text-xs text-gray-400 mt-1">Tickets assigned</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pending</p>
                    <p className="text-3xl font-black text-amber-500">{stats.pending}</p>
                    <p className="text-xs text-gray-400 mt-1">Open + In Progress</p>
                </div>
                <div className="bg-indigo-600 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-1">Critical Priority</p>
                    <p className="text-3xl font-black text-white">{String(stats.critical).padStart(2, '0')}</p>
                    <p className="text-xs text-indigo-200 mt-1">Requiring immediate attention</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Resolved</p>
                    <p className="text-3xl font-black text-emerald-500">{stats.resolved}</p>
                    <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {[['', 'All'], ['open', 'Open'], ['hold', 'Hold'], ['resolved', 'Resolved']].map(([val, label]) => (
                    <button
                        key={val}
                        onClick={() => setStatusFilter(val)}
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
                                <th className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Employee</th>
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
                                    <td className="px-5 py-4 max-w-xs">
                                        <div className="text-gray-700 dark:text-gray-300 text-xs truncate">{ticket.subject || ticket.description || ticket.userQuestion || '—'}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{ticket.themeName}</div>
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
            </div>
        </div>
        </>
    );
};

export default HrOpsDashboard;
