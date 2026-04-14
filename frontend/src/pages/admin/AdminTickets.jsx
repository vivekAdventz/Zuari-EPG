import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getAdminTicketStats, getAdminTickets, getAdminHrOpsUsers, getAdminThemes, exportAdminTickets } from '../../api';
import { FiRefreshCw, FiFilter, FiSearch, FiDownload, FiCalendar } from 'react-icons/fi';

const STATUS_META = {
    open:     { label: 'Open',     cls: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    hold:     { label: 'Hold',     cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
    resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
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

const StatCard = ({ label, value, change, sub, color, icon }) => (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm p-5 group hover:shadow-md transition-shadow">
        <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${color} opacity-10 group-hover:opacity-20 transition-opacity`} />
        <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-md mb-3`}>{icon}</div>
        <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{value}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
            {(change !== undefined && change !== 0) ? (
                <>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${change > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {change > 0 ? '+' : ''}{Number(change).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">vs last week</span>
                </>
            ) : (
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Stable vs last week</span>
            )}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 opacity-70 italic">{sub}</p>
    </div>
);

const SelectFilter = ({ label, value, onChange, options, placeholder }) => (
    <div className="relative">
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm cursor-pointer min-w-[160px]"
        >
            <option value="">{placeholder}</option>
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>
);

const AdminTickets = () => {
    const [stats, setStats] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [hropsFilter, setHropsFilter] = useState('');
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Dropdown options
    const [hropsUsers, setHropsUsers] = useState([]);
    const [themes, setThemes] = useState([]);
    const [dropdownsLoaded, setDropdownsLoaded] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 10;

    // Load dropdowns once on mount
    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                const [hrops, themeList] = await Promise.all([
                    getAdminHrOpsUsers(),
                    getAdminThemes(),
                ]);
                setHropsUsers(hrops);
                setThemes(themeList);
            } catch {
                // silently fail — dropdowns are optional
            } finally {
                setDropdownsLoaded(true);
            }
        };
        loadDropdowns();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const payload = { page, limit: LIMIT };
            if (statusFilter)   payload.status  = statusFilter;
            if (categoryFilter) payload.theme    = categoryFilter;
            if (hropsFilter)    payload.hropsId  = hropsFilter;
            if (search)         payload.search   = search;
            if (startDate)      payload.startDate = startDate;
            if (endDate)        payload.endDate   = endDate;

            const [statsRes, ticketsRes] = await Promise.all([
                getAdminTicketStats(),
                getAdminTickets(payload),
            ]);
            setStats(statsRes);
            setTickets(ticketsRes.data || []);
            setTotalPages(ticketsRes.pages || 1);
            setTotal(ticketsRes.total || 0);
        } catch (e) {
            toast.error(e.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, hropsFilter, search, startDate, endDate, page]);

    const handleExport = async () => {
        try {
            toast.loading('Preparing CSV...', { id: 'export' });
            const payload = {};
            if (statusFilter)   payload.status  = statusFilter;
            if (categoryFilter) payload.theme    = categoryFilter;
            if (hropsFilter)    payload.hropsId  = hropsFilter;
            if (search)         payload.search   = search;
            if (startDate)      payload.startDate = startDate;
            if (endDate)        payload.endDate   = endDate;

            const blob = await exportAdminTickets(payload);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('CSV Downloaded', { id: 'export' });
        } catch (e) {
            toast.error(e.message || 'Failed to export CSV', { id: 'export' });
        }
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetFilters = () => { 
        setStatusFilter(''); 
        setCategoryFilter(''); 
        setHropsFilter(''); 
        setSearch('');
        setStartDate('');
        setEndDate('');
        setPage(1); 
    };
    const hasActiveFilters = statusFilter || categoryFilter || hropsFilter || search || startDate || endDate;

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ago`;
        if (h > 0) return `${h}h ago`;
        return 'Just now';
    };

    const statCards = stats ? [
        {
            label: 'Total Tickets', value: stats.totalTickets?.value ?? 0, change: stats.totalTickets?.change ?? 0, sub: 'All categories, all time',
            color: 'from-violet-500 to-purple-600',
            icon: <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        },
        {
            label: 'Active Tickets', value: stats.activeTickets?.value ?? 0, change: stats.activeTickets?.change ?? 0, sub: 'Open + In Progress',
            color: 'from-blue-500 to-blue-600',
            icon: <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            label: 'Avg Resolution', value: stats.resolutionRate?.value ?? '0%', change: stats.resolutionRate?.change ?? 0, sub: 'Resolved / Total',
            color: 'from-emerald-500 to-teal-500',
            icon: <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            label: 'SLA Failure', value: stats.slaCompliance?.value ?? 0, change: stats.slaCompliance?.change ?? 0, sub: 'Missed closure date',
            color: 'from-amber-500 to-orange-500',
            icon: <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        },
        {
            label: 'Backlog', value: stats.backlog?.value ?? 0, change: stats.backlog?.change ?? 0, sub: 'Overdue active tickets',
            color: 'from-red-500 to-rose-600',
            icon: <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
        },
    ] : [];

    const hropsOptions = hropsUsers.map(u => ({ value: u._id, label: u.name }));
    const themeOptions = themes.map(t => ({ value: t._id, label: t.name }));

    return (
        <div className="space-y-7 animate-up">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Ticket Monitor</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {total > 0
                            ? <span>Showing <span className="font-bold text-gray-800 dark:text-white">{total}</span> tickets {hasActiveFilters ? 'matching filters' : 'across all categories'}</span>
                            : 'All employee tickets — global view'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zuari-navy text-white text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                        <FiDownload size={14} /> Download CSV
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {loading && !stats
                    ? [1,2,3,4,5].map(i => (
                        <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
                            <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded mb-3 w-1/2" />
                            <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded w-1/3" />
                        </div>
                    ))
                    : statCards.map(c => <StatCard key={c.label} {...c} />)
                }
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all">
                
                {/* Search & Reset */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                        <div className="relative flex-1 group">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input 
                                type="text"
                                placeholder="Search by Employee Name, Subject, Description..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-transparent focus:border-blue-500 dark:border-slate-700 rounded-xl text-sm transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 font-medium"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-all flex items-center gap-2"
                            >
                                <span>✕</span> Reset All
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-px bg-gray-50 dark:bg-slate-700/50 w-full" />

                {/* Sub Filters Row */}
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <FiFilter size={12} /> Status
                    </div>
                    <div className="flex gap-1.5 p-1 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700">
                        {[['', 'All'], ['open', 'Open'], ['hold', 'Hold'], ['resolved', 'Resolved']].map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => { setStatusFilter(val); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === val ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-gray-100 dark:border-slate-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >{label}</button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1" />

                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <FiCalendar size={12} /> Date Range
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <span className="text-gray-400 text-xs font-bold">to</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1" />

                    <SelectFilter
                        value={categoryFilter}
                        onChange={v => { setCategoryFilter(v); setPage(1); }}
                        options={themeOptions}
                        placeholder="All Categories"
                    />

                    <SelectFilter
                        value={hropsFilter}
                        onChange={v => { setHropsFilter(v); setPage(1); }}
                        options={hropsOptions}
                        placeholder="All HROps POC"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                {['Ticket ID', 'Raised By', 'Category', 'Assigned To', 'Subject', 'Description', 'Status', 'Created'].map(h => (
                                    <th key={h} className="px-5 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {loading ? (
                                [1,2,3].map(i => (
                                    <tr key={i}>
                                        {[1,2,3,4,5,6,7].map(j => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="animate-pulse bg-gray-100 dark:bg-slate-700 rounded-lg h-4 w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-14 text-center text-gray-400 dark:text-slate-500">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 mx-auto mb-3 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        </div>
                                        No tickets found
                                    </td>
                                </tr>
                            ) : tickets.map(ticket => {
                                // hrOpsPoc is now injected by the backend
                                const poc = ticket.hrOpsPoc || null;

                                return (
                                    <tr key={ticket._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">{ticket.ticketNumber}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(ticket.createdAt)}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {ticket.userName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800 dark:text-white text-xs">{ticket.userName}</div>
                                                    <div className="text-[10px] text-gray-400">{ticket.userEmail}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg whitespace-nowrap">
                                                {ticket.themeName || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {poc ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                        {poc.name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{poc.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300 dark:text-slate-600 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-gray-700 dark:text-gray-300 text-xs font-bold">
                                                {ticket.subject || '—'}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-gray-700 dark:text-gray-300 text-xs">
                                                {ticket.description || ticket.userQuestion || '—'}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge status={ticket.status} />
                                        </td>
                                        <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-[24px]">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Page <span className="text-gray-900 dark:text-white font-black">{page}</span> of {totalPages}
                            <span className="ml-2 opacity-60">({total} total)</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors"
                            >Previous</button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors"
                            >Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTickets;
