import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { FiMessageCircle } from 'react-icons/fi';
import { getAssignedTickets, updateAssignedTicket, getEmployeeQuestionThemes } from '../api';
import TicketChatModal from './TicketChatModal';

const STATUS_OPTIONS = [
    { value: '', label: 'All Tickets' },
    { value: 'open', label: 'Open' },
    { value: 'hold', label: 'Hold' },
    { value: 'resolved', label: 'Resolved' },
];

const StatusBadge = ({ status }) => {
    const map = {
        open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'hold': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${map[status] || 'bg-gray-100 text-gray-500'}`}>
            {status === 'hold' ? 'Hold' : status?.charAt(0).toUpperCase() + status?.slice(1)}
        </span>
    );
};

const TicketDetailModal = ({ ticket, onClose, onUpdate }) => {
    const [status, setStatus] = useState(ticket.status);
    const [hrResponse, setHrResponse] = useState(ticket.hrResponse || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onUpdate(ticket._id, { status, hrResponse });
            toast.success('Ticket updated');
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to update ticket');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.ticketNumber}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.themeName || 'General'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {/* Employee Info */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-zuari-navy flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {ticket.userName?.charAt(0) || '?'}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800 dark:text-white text-sm">{ticket.userName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.userEmail} {ticket.userEntity ? `· ${ticket.userEntity}` : ''}</div>
                        </div>
                        <div className="ml-auto text-xs text-gray-400 dark:text-gray-500">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>

                    {/* Subject */}
                    {ticket.subject && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{ticket.subject}</p>
                        </div>
                    )}

                    {/* Question */}
                    {ticket.userQuestion && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Employee Question</p>
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{ticket.userQuestion}</div>
                        </div>
                    )}

                    {/* AI Response */}
                    {ticket.aiResponse && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">AskHR's Response</p>
                            <div
                                className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 prose prose-sm max-w-none dark:prose-invert"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.aiResponse) }}
                            />
                        </div>
                    )}

                    {/* Description */}
                    {ticket.description && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Description</p>
                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{ticket.description}</div>
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Update Status</p>
                        <div className="flex gap-2 flex-wrap">
                            {['open', 'hold', 'resolved'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                        status === s
                                            ? s === 'open' ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400'
                                              : s === 'hold' ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
                                              : 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-400'
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    {s === 'hold' ? 'Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* HR Response */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Your Response</p>
                        <textarea
                            value={hrResponse}
                            onChange={e => setHrResponse(e.target.value)}
                            rows={4}
                            placeholder="Write your response to the employee..."
                            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm p-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-zuari-navy/30 focus:border-zuari-navy resize-none transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-zuari-navy hover:bg-[#122856] text-white text-sm font-bold transition-all disabled:opacity-70"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const HrOpsDashboard = ({ onBack }) => {
    const [tickets, setTickets] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [chatTicket, setChatTicket] = useState(null);
    const [page, setPage] = useState(1);
    const limit = 15;

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const filters = { page, limit };
            if (statusFilter) filters.status = statusFilter;
            if (categoryFilter) filters.category = categoryFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            const res = await getAssignedTickets(filters);
            setTickets(res.data || []);
            setTotal(res.total || 0);
        } catch (err) {
            toast.error(err.message || 'Failed to fetch tickets');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, startDate, endDate, page]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const themes = await getEmployeeQuestionThemes();
                setCategories(themes || []);
            } catch (e) {
                console.error('Failed to load categories:', e);
            }
        };
        loadCategories();
    }, []);

    const handleUpdate = async (id, updates) => {
        const updated = await updateAssignedTicket(id, updates);
        setTickets(prev => prev.map(t => t._id === id ? { ...t, ...updated } : t));
    };

    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'hold').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
            {/* Top bar */}
            <div className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shrink-0">
                <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white">My Assigned Tickets</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Support tickets routed to you</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Assigned', value: total, color: 'text-zuari-navy dark:text-blue-400' },
                        { label: 'Open', value: openCount, color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'In Progress', value: inProgressCount, color: 'text-blue-600 dark:text-blue-400' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters Bar */}
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Status</label>
                            <div className="flex gap-2 flex-wrap">
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${statusFilter === opt.value ? 'bg-zuari-navy text-white border-zuari-navy shadow-md' : 'bg-transparent text-gray-500 border-gray-100 dark:border-slate-700 hover:border-gray-200'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full md:w-auto min-w-[180px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Category</label>
                            <select
                                value={categoryFilter}
                                onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                                className="w-full rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-xs font-bold p-2.5 outline-none transition-all"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full md:w-auto min-w-[320px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Date Range</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => { setStartDate(e.target.value); setPage(1); }}
                                    className="flex-1 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-xs font-bold p-2.5 outline-none"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => { setEndDate(e.target.value); setPage(1); }}
                                    className="flex-1 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-xs font-bold p-2.5 outline-none"
                                />
                                {(startDate || endDate) && (
                                    <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticket list */}
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-semibold">No tickets assigned to you</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tickets for your categories will appear here</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ticket</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Created</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Closure</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Chat</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket._id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono font-bold text-zuari-navy dark:text-blue-400">{ticket.ticketNumber}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-zuari-navy flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                                                        {ticket.userName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[120px]">{ticket.userName}</p>
                                                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{ticket.userEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[150px]" title={ticket.subject || ticket.userQuestion}>
                                                    {ticket.subject || ticket.userQuestion || 'No subject'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={ticket.description}>
                                                    {ticket.description || '—'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                    {ticket.themeName || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={ticket.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {ticket.daysToClosure == null ? (
                                                    <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                                                ) : ticket.status === 'resolved' ? (
                                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        Closed in {Math.max(1, Math.ceil((new Date(ticket.updatedAt) - new Date(ticket.createdAt)) / 86400000))}d
                                                    </span>
                                                ) : ticket.status === 'hold' ? (
                                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                                        On Hold
                                                    </span>
                                                ) : ticket.daysRemaining > 0 ? (
                                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        {ticket.daysRemaining}d left
                                                    </span>
                                                ) : ticket.daysRemaining === 0 ? (
                                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                                        Due today
                                                    </span>
                                                ) : (
                                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                        Overdue {Math.abs(ticket.daysRemaining)}d
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => setChatTicket(ticket)}
                                                    className="relative p-2 rounded-xl text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all"
                                                    title="Open Chat"
                                                >
                                                    <FiMessageCircle size={20} />
                                                    {ticket.unreadMessages > 0 && (
                                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="p-2 text-gray-400 hover:text-zuari-navy hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {Math.ceil(total / limit) > 1 && (
                    <div className="flex justify-center gap-2 pt-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                        >Previous</button>
                        <span className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">{page} / {Math.ceil(total / limit)}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= Math.ceil(total / limit)}
                            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                        >Next</button>
                    </div>
                )}
            </div>

            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={handleUpdate}
                />
            )}
            {chatTicket && (
                <TicketChatModal
                    ticket={chatTicket}
                    onClose={() => { setChatTicket(null); fetchTickets(); }}
                    userRole="hrops"
                />
            )}
        </div>
    );
};

export default HrOpsDashboard;
