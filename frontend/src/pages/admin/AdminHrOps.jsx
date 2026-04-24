import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
    getHrOpsAssignments, 
    assignHrOps, 
    unassignHrOps, 
    toggleHrOpsUserStatus, 
    updateThemeClosure 
} from '../../api';
import { FiChevronDown, FiInfo, FiTrash2 } from 'react-icons/fi';

const AdminHrOps = () => {
    const [themes, setThemes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Track local changes before hitting "Save All Changes"
    const [localAssignments, setLocalAssignments] = useState({}); // { [themeId]: userId }
    const [localSLA, setLocalSLA] = useState({}); // { [themeId]: days }
    const [originalAssignments, setOriginalAssignments] = useState({});
    const [originalSLA, setOriginalSLA] = useState({});

    const fetchData = async () => {
        try {
            const res = await getHrOpsAssignments();
            const fetchedThemes = res.data || [];
            const fetchedEmployees = res.employees || [];
            
            setThemes(fetchedThemes);
            setEmployees(fetchedEmployees);

            const assignments = {};
            const sla = {};
            fetchedThemes.forEach(t => {
                const assigned = t.hrOpsUsers?.[0]; // Assume 1:1 as per business rule
                assignments[t._id] = assigned?._id || '';
                sla[t._id] = t.daysToClosure ?? '';
            });

            setLocalAssignments(assignments);
            setLocalSLA(sla);
            setOriginalAssignments({ ...assignments });
            setOriginalSLA({ ...sla });
        } catch (err) {
            toast.error(err.message || 'Failed to load HROps data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveAll = async () => {
        setSaving(true);
        const updates = [];

        // Identify SLA changes
        Object.keys(localSLA).forEach(themeId => {
            if (localSLA[themeId] !== originalSLA[themeId]) {
                const val = localSLA[themeId] === '' ? null : Number(localSLA[themeId]);
                updates.push(updateThemeClosure({ themeId, daysToClosure: val }));
            }
        });

        // Identify assignment changes
        Object.keys(localAssignments).forEach(themeId => {
            if (localAssignments[themeId] !== originalAssignments[themeId]) {
                const userId = localAssignments[themeId];
                if (userId) {
                    updates.push(assignHrOps({ themeId, userId }));
                } else {
                    // If it was unassigned
                    const originalUserId = originalAssignments[themeId];
                    if (originalUserId) {
                        updates.push(unassignHrOps({ themeId, userId: originalUserId }));
                    }
                }
            }
        });

        if (updates.length === 0) {
            setSaving(false);
            return toast('No changes to save');
        }

        try {
            await Promise.all(updates);
            toast.success('All changes saved successfully');
            await fetchData();
        } catch (err) {
            toast.error(err.message || 'Error saving some changes');
            // Still refresh to get latest state
            await fetchData();
        } finally {
            setSaving(false);
        }
    };

    const handleUnassign = (themeId) => {
        setLocalAssignments(prev => ({ ...prev, [themeId]: '' }));
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <div className="p-12 text-center animate-pulse">
                <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded mx-auto mb-4" />
                <div className="h-4 w-64 bg-gray-100 dark:bg-slate-800 rounded mx-auto" />
            </div>
        );
    }

    const hasChanges = JSON.stringify(localAssignments) !== JSON.stringify(originalAssignments) ||
                      JSON.stringify(localSLA) !== JSON.stringify(originalSLA);

    return (
        <div className="w-full p-2 space-y-6">
            {/* Top Bar */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h1 className="text-xl font-black text-[#1e293b] dark:text-white">HROps Management</h1>
                    <p className="text-xs text-[#64748b] dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
                        Assign HR Operations representatives to support categories. Only one HROps per category is allowed; 
                        however, a representative can handle multiple categories.
                    </p>
                </div>
                <button
                    onClick={handleSaveAll}
                    disabled={saving || !hasChanges}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                        saving || !hasChanges 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-[#fff9f0] border border-[#ffedcf] rounded-xl p-3 flex items-center gap-3">
                <div className="text-[#f59e0b]">
                    <FiInfo size={18} />
                </div>
                <p className="text-[#854d0e] text-[11px] font-bold">
                    Assign roles via User Management before adding here.
                </p>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-800 border border-[#f1f5f9] dark:border-slate-700 rounded-[28px] shadow-xl overflow-hidden shadow-slate-200/50">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#f1f5f9] dark:border-slate-700">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Category</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Description</th>
                            <th className="px-4 py-4 text-center text-[10px] font-black text-[#94a3b8] uppercase tracking-widest leading-tight">SLA<br/>(Days)</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Assigned Representative</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8fafc] dark:divide-slate-700/50">
                        {themes.map(theme => {
                            const assignedId = localAssignments[theme._id];
                            const assignedUser = employees.find(e => e._id === assignedId);
                            
                            return (
                                <tr key={theme._id} className="hover:bg-[#fcfdfe] dark:hover:bg-slate-700/20 transition-colors">
                                    {/* Category */}
                                    <td className="px-6 py-5 w-1/5">
                                        <div className="text-[#1e293b] dark:text-white font-black text-sm tracking-tight">
                                            {theme.name}
                                        </div>
                                    </td>

                                    {/* Description */}
                                    <td className="px-4 py-5">
                                        <div className="text-[#64748b] dark:text-slate-400 text-[11px] leading-relaxed font-medium">
                                            {theme.description || '—'}
                                        </div>
                                    </td>

                                    {/* SLA */}
                                    <td className="px-4 py-5 text-center w-24">
                                        <input
                                            type="number"
                                            min="0"
                                            value={localSLA[theme._id] ?? ''}
                                            onChange={(e) => setLocalSLA(prev => ({ ...prev, [theme._id]: e.target.value }))}
                                            className="w-14 h-9 text-center bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-700 rounded-lg font-bold text-[#1e293b] dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm shadow-slate-100"
                                        />
                                    </td>

                                    {/* Assigned Representative */}
                                    <td className="px-4 py-5">
                                        {assignedUser ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#f1f5f9] dark:bg-slate-700 flex items-center justify-center text-[#64748b] dark:text-slate-300 font-black text-xs border-2 border-white shadow-sm shrink-0">
                                                    {getInitials(assignedUser.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[#1e293b] dark:text-white font-black text-xs truncate leading-tight">
                                                        {assignedUser.name}
                                                    </div>
                                                    <div className="text-[#94a3b8] dark:text-slate-500 text-[10px] font-bold truncate lowercase leading-tight">
                                                        {assignedUser.email}
                                                    </div>
                                                    <div className="mt-0.5 inline-flex items-center gap-1 text-[8px] font-black text-[#10b981] uppercase tracking-tighter">
                                                        <span className="w-1 h-1 rounded-full bg-[#10b981]" />
                                                        Active
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[#cbd5e1] text-[10px] font-bold uppercase tracking-widest italic">Not Assigned</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="relative group/sel">
                                                <select
                                                    value={assignedId}
                                                    onChange={(e) => setLocalAssignments(prev => ({ ...prev, [theme._id]: e.target.value }))}
                                                    className="appearance-none pl-3 pr-8 py-2 h-9 bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-600 rounded-lg text-[10px] font-black text-[#64748b] dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 cursor-pointer shadow-sm hover:border-indigo-300 transition-all min-w-[170px]"
                                                >
                                                    <option value="">Change HROps...</option>
                                                    {employees.map(emp => (
                                                        <option key={emp._id} value={emp._id}>
                                                            {emp.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[#94a3b8]">
                                                    <FiChevronDown size={14} />
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleUnassign(theme._id)}
                                                disabled={!assignedId}
                                                className={`p-2 rounded-lg transition-all ${
                                                    assignedId 
                                                    ? 'text-[#94a3b8] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20' 
                                                    : 'text-gray-200 cursor-not-allowed'
                                                }`}
                                                title="Remove Assignment"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminHrOps;
