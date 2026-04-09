import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getHrOpsAssignments, assignHrOps, unassignHrOps, toggleHrOpsUserStatus, updateThemeClosure } from '../../api';

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        status === 'active'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
    }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        {status === 'active' ? 'Active' : 'Inactive'}
    </span>
);

const AdminHrOps = () => {
    const [themes, setThemes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingTheme, setSavingTheme] = useState(null); // themeId being saved
    const [selectedEmp, setSelectedEmp] = useState({}); // { [themeId]: userId }
    const [closureDays, setClosureDays] = useState({}); // { [themeId]: number|'' }
    const [savingClosure, setSavingClosure] = useState(null); // themeId being saved

    const fetchData = async () => {
        try {
            const res = await getHrOpsAssignments();
            setThemes(res.data || []);
            setEmployees(res.employees || []);
            // Initialize closure days from fetched themes
            const days = {};
            (res.data || []).forEach(t => { days[t._id] = t.daysToClosure ?? ''; });
            setClosureDays(days);
        } catch (err) {
            toast.error(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAssign = async (themeId) => {
        const userId = selectedEmp[themeId];
        if (!userId) return toast.error('Please select an employee first');

        setSavingTheme(themeId);
        try {
            await assignHrOps({ themeId, userId });
            toast.success('HROps assigned successfully');
            setSelectedEmp(prev => ({ ...prev, [themeId]: '' }));
            await fetchData();
        } catch (err) {
            toast.error(err.message || 'Failed to assign HROps');
        } finally {
            setSavingTheme(null);
        }
    };

    const handleUnassign = async (themeId, userId) => {
        try {
            await unassignHrOps({ themeId, userId });
            toast.success('HROps removed');
            await fetchData();
        } catch (err) {
            toast.error(err.message || 'Failed to remove HROps');
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await toggleHrOpsUserStatus({ userId, status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
            await fetchData();
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const handleSaveClosure = async (themeId) => {
        const raw = closureDays[themeId];
        const value = raw === '' || raw === null || raw === undefined ? null : Number(raw);
        if (value !== null && (!Number.isInteger(value) || value < 1)) {
            return toast.error('Enter a positive number of days or leave empty');
        }
        setSavingClosure(themeId);
        try {
            await updateThemeClosure({ themeId, daysToClosure: value });
            toast.success('Days to closure updated');
            await fetchData();
        } catch (err) {
            toast.error(err.message || 'Failed to update days to closure');
        } finally {
            setSavingClosure(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading HROps assignments...</div>;

    return (
        <div className="space-y-8 animate-up">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight mb-2">HROps Management</h1>
                <p className="text-gray-500 dark:text-gray-400">Assign HROps representatives to support categories. One HROps per category; a representative can handle multiple categories.</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">Only users with the HROps role appear in the dropdown. Assign the HROps role via User Management first.</p>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-1/6">Category</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-1/6">Description</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-1/6">Days to Closure</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-1/4">Assigned HROps</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest w-1/4">Add HROps</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {themes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                                        No categories found. Please seed question themes first.
                                    </td>
                                </tr>
                            ) : themes.map(theme => (
                                <tr key={theme._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                    {/* Category */}
                                    <td className="px-6 py-5 align-top">
                                        <div className="font-bold text-gray-900 dark:text-white">{theme.name}</div>
                                    </td>

                                    {/* Description */}
                                    <td className="px-6 py-5 align-top">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{theme.description || '—'}</div>
                                    </td>

                                    {/* Days to Closure */}
                                    <td className="px-6 py-5 align-top">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="—"
                                                value={closureDays[theme._id] ?? ''}
                                                onChange={e => setClosureDays(prev => ({ ...prev, [theme._id]: e.target.value }))}
                                                className="w-20 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-zuari-navy/30 focus:border-zuari-navy transition-all"
                                            />
                                            <button
                                                onClick={() => handleSaveClosure(theme._id)}
                                                disabled={savingClosure === theme._id}
                                                className="px-3 py-2 bg-zuari-navy hover:bg-[#122856] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-900/20 whitespace-nowrap"
                                            >
                                                {savingClosure === theme._id ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </td>

                                    {/* Assigned HROps */}
                                    <td className="px-6 py-5 align-top">
                                        {theme.hrOpsUsers.length === 0 ? (
                                            <span className="text-xs text-gray-400 dark:text-slate-500 italic">No HROps assigned</span>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {theme.hrOpsUsers.map(u => (
                                                    <div key={u._id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 rounded-xl px-3 py-2 group">
                                                        <div className="w-7 h-7 rounded-full bg-zuari-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                            {u.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-gray-800 dark:text-white text-xs truncate">{u.name}</div>
                                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{u.email}</div>
                                                        </div>
                                                        {/* Active / Inactive toggle */}
                                                        <button
                                                            onClick={() => handleToggleStatus(u._id, u.status)}
                                                            title={`Click to mark as ${u.status === 'active' ? 'inactive' : 'active'}`}
                                                            className="shrink-0"
                                                        >
                                                            <StatusBadge status={u.status} />
                                                        </button>
                                                        {/* Remove */}
                                                        <button
                                                            onClick={() => handleUnassign(theme._id, u._id)}
                                                            className="shrink-0 p-1 rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove from this category"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>

                                    {/* Add HROps */}
                                    <td className="px-6 py-5 align-top">
                                        {employees.length === 0 ? (
                                            <span className="text-xs text-gray-400 dark:text-slate-500 italic">No HROps users available — assign HROps role in User Management first</span>
                                        ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <select
                                                    value={selectedEmp[theme._id] || ''}
                                                    onChange={e => setSelectedEmp(prev => ({ ...prev, [theme._id]: e.target.value }))}
                                                    className="w-full pr-8 pl-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-zuari-navy/30 focus:border-zuari-navy transition-all"
                                                >
                                                    <option value="">Select HROps user...</option>
                                                    {employees
                                                        .filter(emp => !theme.hrOpsUsers.some(u => u._id === emp._id))
                                                        .map(emp => (
                                                            <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                                                        ))
                                                    }
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAssign(theme._id)}
                                                disabled={savingTheme === theme._id || !selectedEmp[theme._id]}
                                                className="px-4 py-2.5 bg-zuari-navy hover:bg-[#122856] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-900/20 whitespace-nowrap"
                                            >
                                                {savingTheme === theme._id ? 'Assigning...' : 'Assign'}
                                            </button>
                                        </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-slate-500 px-1">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active — tickets will be routed to this HROps representative
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Inactive — tickets will not be routed to this representative
                </div>
            </div>
        </div>
    );
};

export default AdminHrOps;
