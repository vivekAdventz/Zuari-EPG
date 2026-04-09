import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    getAdminUsers, createUser, deleteUser, updateUser,
    previewEmployeesCsv, bulkCreateEmployees, downloadEmployeeTemplate,
    getConfigEntities, getImpactLevels, getEmployeeCategories, getQuestionThemes,
} from '../../api';
import ConfirmationModal from '../../components/ConfirmationModal';

const AVAILABLE_ROLES = [
    { value: 'employee', label: 'Employee' },
    { value: 'admin', label: 'Admin' },
    { value: 'hrOps', label: 'HROps' },
];

// ── Reusable styled select wrapper ──────────────────────────────────────────
const SelectField = ({ label, name, value, onChange, children, disabled }) => (
    <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                           focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium
                           appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {children}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    </div>
);

const AdminEmployees = () => {
    const [users, setUsers] = useState([]);
    const [configEntities, setConfigEntities] = useState([]);
    const [allImpactLevels, setAllImpactLevels] = useState([]);
    const [empCategories, setEmpCategories] = useState([]);
    const [questionThemes, setQuestionThemes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [creationMode, setCreationMode] = useState(null); // 'manual' | 'bulk' | null
    const [uploadFile, setUploadFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewStats, setPreviewStats] = useState(null);

    const emptyForm = {
        name: '',
        email: '',
        entity: '',           // config entity _id
        entity_code: '',      // auto-filled from entity selection
        impactLevel: '',      // impact level _id
        empCategory: '',      // employee category _id
        status: 'active',
        gender: 'Male',
        roles: ['employee'],
        assignedThemes: [],   // QuestionTheme _ids (hrOps only)
    };

    const [formData, setFormData] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // ── Impact levels filtered by selected entity ──────────────────────────
    const filteredImpactLevels = formData.entity
        ? allImpactLevels.filter(il => il.entity?._id === formData.entity)
        : allImpactLevels;

    const selectedCategory = empCategories.find(cat => cat._id === formData.empCategory);
    const requiresImpactLevel = selectedCategory && (selectedCategory.code === 'PE' || selectedCategory.name.toLowerCase().includes('permanent'));

    // ── Fetch on mount ─────────────────────────────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [usersData, entities, impacts, categories, themes] = await Promise.all([
                    getAdminUsers(),
                    getConfigEntities(),
                    getImpactLevels(),
                    getEmployeeCategories(),
                    getQuestionThemes(),
                ]);
                setUsers(usersData);
                setConfigEntities(entities);
                setAllImpactLevels(impacts);
                setEmpCategories(categories);
                setQuestionThemes(themes);
            } catch (error) {
                toast.error(error.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ── Field change handler ───────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { ...prev, [name]: value };

            // Auto-fill entity_code when entity changes; also reset impact level
            if (name === 'entity') {
                const selected = configEntities.find(en => en._id === value);
                updates.entity_code = selected?.entityCode || '';
                updates.impactLevel = ''; // reset when entity changes
            }

            if (name === 'empCategory') {
                const selectedCat = empCategories.find(cat => cat._id === value);
                const isCatPermanent = selectedCat && (selectedCat.code === 'PE' || selectedCat.name.toLowerCase().includes('permanent'));
                if (!isCatPermanent) {
                    updates.impactLevel = '';
                }
            }

            return updates;
        });
    };

    const handleRoleToggle = (roleValue) => {
        setFormData(prev => {
            const currentRoles = prev.roles || ['employee'];
            if (currentRoles.includes(roleValue)) {
                if (currentRoles.length === 1) { toast.error('User must have at least one role'); return prev; }
                const newRoles = currentRoles.filter(r => r !== roleValue);
                return { ...prev, roles: newRoles };
            }
            // HROps <-> Admin mutual exclusion
            if (roleValue === 'hrOps' && currentRoles.includes('admin')) {
                toast.error('HROps users cannot have the Admin role');
                return prev;
            }
            if (roleValue === 'admin' && currentRoles.includes('hrOps')) {
                toast.error('Admin users cannot have the HROps role');
                return prev;
            }
            return { ...prev, roles: [...currentRoles, roleValue] };
        });
    };

    const handleThemeToggle = (themeId) => {
        setFormData(prev => {
            const current = prev.assignedThemes || [];
            if (current.includes(themeId)) {
                return { ...prev, assignedThemes: current.filter(id => id !== themeId) };
            }
            return { ...prev, assignedThemes: [...current, themeId] };
        });
    };

    // ── Create / Update user ───────────────────────────────────────────────
    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.entity) {
            toast.error('Please fill all required fields');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                roles: formData.roles,
                entity: formData.entity,
                entity_code: formData.entity_code,
                level: formData.impactLevel,       // send impact level id as "level"
                empCategory: formData.empCategory,
                status: formData.status,
                gender: formData.gender,
                assignedThemes: formData.roles.includes('hrOps') ? formData.assignedThemes : [],
            };

            if (isEditing) {
                await updateUser(editId, payload);
            } else {
                await createUser(payload);
            }

            const updatedUsers = await getAdminUsers();
            setUsers(updatedUsers);
            setFormData(emptyForm);
            setIsEditing(false);
            setEditId(null);
            toast.success(isEditing ? 'User updated successfully!' : 'User created successfully!');
        } catch (error) {
            toast.error(error.message || 'Failed to save user');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────
    const confirmDeleteUser = (id) => { setUserToDelete(id); setIsDeleteModalOpen(true); };
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete);
            setUsers(users.filter(u => u._id !== userToDelete));
            toast.success('User deleted successfully');
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    // ── Edit click ─────────────────────────────────────────────────────────
    const handleEditClick = (userItem) => {
        // entity/level/empCategory arrive as populated objects from the API
        // Extract _id for the dropdown value
        const entityId = userItem.entity?._id || userItem.entity || '';
        const levelId = userItem.level?._id || userItem.level || '';
        const catId = userItem.empCategory?._id || userItem.empCategory || '';

        setFormData({
            name: userItem.name,
            email: userItem.email,
            entity: entityId,
            entity_code: userItem.entity_code || userItem.entity?.entityCode || '',
            impactLevel: levelId,
            empCategory: catId,
            status: userItem.status || 'active',
            gender: userItem.gender || 'Male',
            roles: userItem.roles || ['employee'],
            assignedThemes: (userItem.assignedThemes || []).map(t => t._id || t),
        });
        setEditId(userItem._id);
        setIsEditing(true);
        setCreationMode('manual');
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData(emptyForm);
    };

    // ── Bulk upload ────────────────────────────────────────────────────────
    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) {
            setUploadFile(e.target.files[0]);
            setPreviewData(null);
            setPreviewStats(null);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return toast.error('Please select a file');
        setIsSubmitting(true);
        try {
            const data = await previewEmployeesCsv(uploadFile);
            setPreviewData(data.results);
            setPreviewStats(data.stats);
        } catch (err) {
            toast.error(err.message || 'Failed to parse file');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmImport = async () => {
        const validRows = previewData.filter(row => row.isValid).map(row => row.parsedData);
        if (validRows.length === 0) return toast.error('No valid rows to import');

        setIsSubmitting(true);
        try {
            const res = await bulkCreateEmployees(validRows);
            toast.success(res.message);
            res.errors?.forEach(err => toast.error(err, { duration: 6000 }));
            const updatedUsers = await getAdminUsers();
            setUsers(updatedUsers);
            setPreviewData(null);
            setPreviewStats(null);
            setUploadFile(null);
            if (document.getElementById('csvInput')) document.getElementById('csvInput').value = '';
        } catch (err) {
            toast.error(err.message || 'Failed to import employees');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

    return (
        <div className="space-y-8 animate-up">
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteUser}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Delete User"
                isDanger={true}
            />

            {/* Page Title */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight mb-2">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage users, assign roles and control access</p>
                </div>
            </div>

            {/* Action Tabs */}
            <div className="flex gap-4">
                <button
                    onClick={() => { setCreationMode('manual'); setIsEditing(false); }}
                    className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${creationMode === 'manual' || isEditing
                        ? 'bg-zuari-navy text-white shadow-lg shadow-blue-900/20'
                        : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                >
                    Manual Creation
                </button>
                <button
                    onClick={() => { setCreationMode('bulk'); setIsEditing(false); }}
                    className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${creationMode === 'bulk'
                        ? 'bg-zuari-navy text-white shadow-lg shadow-blue-900/20'
                        : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                >
                    Bulk Upload
                </button>
            </div>

            {/* Form Container */}
            {(creationMode || isEditing) && (
                <div className="w-full">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-700 relative animate-up">
                        {/* Close */}
                        <button
                            onClick={() => { setCreationMode(null); setIsEditing(false); }}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* ── Manual Form ── */}
                        {(creationMode === 'manual' || isEditing) ? (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
                                    {isEditing ? 'Edit User' : 'Create New User'}
                                </h3>

                                <form onSubmit={handleCreateUser} className="space-y-5">
                                    {/* Row 1: Name + Email */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                            <input
                                                type="text" name="name" value={formData.name} onChange={handleChange}
                                                placeholder="Ex. Jane Doe"
                                                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Work Email</label>
                                            <input
                                                type="email" name="email" value={formData.email} onChange={handleChange}
                                                placeholder="jane@zuari.com"
                                                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Entity + Employee Category */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectField label="Assign Entity" name="entity" value={formData.entity} onChange={handleChange}>
                                            <option value="" disabled>Select Entity</option>
                                            {configEntities.map(en => (
                                                <option key={en._id} value={en._id}>{en.name} ({en.entityCode})</option>
                                            ))}
                                        </SelectField>

                                        <SelectField label="Employee Category" name="empCategory" value={formData.empCategory} onChange={handleChange}>
                                            <option value="">Select Category</option>
                                            {empCategories.map(cat => (
                                                <option key={cat._id} value={cat._id}>{cat.name} ({cat.code})</option>
                                            ))}
                                        </SelectField>
                                    </div>

                                    {/* Row 3: Impact Level + Status */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectField
                                            label="Impact Level"
                                            name="impactLevel"
                                            value={formData.impactLevel}
                                            onChange={handleChange}
                                            disabled={!formData.entity || !requiresImpactLevel}
                                        >
                                            <option value="">
                                                {!requiresImpactLevel ? 'Not Applicable' : (formData.entity ? 'Select Impact Level' : 'Select an entity first')}
                                            </option>
                                            {filteredImpactLevels.map(il => (
                                                <option key={il._id} value={il._id}>{il.name}</option>
                                            ))}
                                        </SelectField>

                                        <SelectField label="Status" name="status" value={formData.status} onChange={handleChange}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </SelectField>
                                    </div>

                                    {/* Row 4: Gender + Empty Space (or something else) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleChange}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </SelectField>
                                    </div>

                                    {/* Row 5: Roles */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assign Roles</label>
                                        <div className="flex flex-wrap gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                                            {AVAILABLE_ROLES.map(role => (
                                                <label
                                                    key={role.value}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all text-sm font-semibold border ${formData.roles?.includes(role.value)
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.roles?.includes(role.value) || false}
                                                        onChange={() => handleRoleToggle(role.value)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${formData.roles?.includes(role.value)
                                                        ? 'bg-blue-500 border-blue-500'
                                                        : 'border-gray-300 dark:border-slate-500'
                                                        }`}>
                                                        {formData.roles?.includes(role.value) && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {role.label}
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5 px-1">HROps and Admin roles are mutually exclusive. Assign categories to HROps users via <span className="font-semibold">HROps Management</span>.</p>
                                    </div>

                                    {/* Submit / Cancel */}
                                    <div className="flex gap-3 pt-2">
                                        {isEditing && (
                                            <button
                                                type="button" onClick={handleCancelEdit}
                                                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-2xl font-bold transition-all"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit" disabled={isSubmitting}
                                            className="flex-1 py-4 bg-zuari-navy hover:bg-[#122856] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70"
                                        >
                                            {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            /* ── Bulk Upload ── */
                            previewData ? (
                                <div className="py-6 animate-up">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Review Import Data</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                We found <span className="font-bold text-red-500">{previewStats.invalid} issues</span> across {previewStats.total} records.
                                                {previewStats.invalid > 0 && " Hover over the error badge to see details."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 max-h-[400px] overflow-y-auto mb-6">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">#</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Email</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Entity</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Level</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Category</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Gender</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Role</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {previewData.map((row) => (
                                                    <tr key={row.rowNumber} className={!row.isValid ? 'bg-red-50/20 dark:bg-red-900/10' : ''}>
                                                        <td className="px-4 py-3 text-gray-500 align-top pt-5">{row.rowNumber}</td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className={`p-2 rounded-lg transition-colors ${row.fieldErrors?.name ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200' : 'text-gray-900 dark:text-white'}`}>
                                                                <div className="font-medium">{row.originalData.name || '—'}</div>
                                                                {row.fieldErrors?.name && <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{row.fieldErrors.name}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className={`p-2 rounded-lg transition-colors ${row.fieldErrors?.email ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                <div>{row.originalData.email || '—'}</div>
                                                                {row.fieldErrors?.email && <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{row.fieldErrors.email}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className={`p-2 rounded-lg transition-colors ${row.fieldErrors?.entity ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                <div>{row.originalData.entityCodeStr || row.originalData.entityStr || '—'}</div>
                                                                {row.fieldErrors?.entity && <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{row.fieldErrors.entity}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className={`p-2 rounded-lg transition-colors ${row.fieldErrors?.level ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                <div>{row.originalData.levelStr || '—'}</div>
                                                                {row.fieldErrors?.level && <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{row.fieldErrors.level}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className={`p-2 rounded-lg transition-colors ${row.fieldErrors?.category ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                <div>{row.originalData.categoryStr || '—'}</div>
                                                                {row.fieldErrors?.category && <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{row.fieldErrors.category}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="p-2 text-gray-600 dark:text-gray-400">{row.originalData.genderStr || '—'}</div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="p-2 text-gray-600 dark:text-gray-400 capitalize">{row.originalData.role || '—'}</div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top pt-5">
                                                            {row.isValid ? (
                                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">VALID</span>
                                                            ) : (
                                                                <div className="relative group inline-block">
                                                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold cursor-help">ERRORS</span>
                                                                    <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-20 whitespace-normal">
                                                                        {row.errors?.map((err, i) => <div key={i}>• {err}</div>)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-6">
                                        <div className="text-sm text-gray-500 italic">
                                            {previewStats.invalid > 0 ? `${previewStats.invalid} rows will be skipped during import.` : 'All rows are valid and ready to import.'}
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setPreviewData(null); setPreviewStats(null); setUploadFile(null); if (document.getElementById('csvInput')) document.getElementById('csvInput').value = ''; }}
                                                className="px-6 py-3 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmImport} disabled={isSubmitting || previewStats.valid === 0}
                                                className="px-6 py-3 bg-zuari-navy hover:bg-[#122856] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
                                            >
                                                {isSubmitting ? 'Importing...' : `Complete Import (${previewStats.valid})`}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center flex flex-col items-center justify-center py-12">
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-500">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Upload Users CSV</h3>
                                    <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">Import your CSV file to bulk-create users. Ensure required headers are present.</p>

                                    <input type="file" id="csvInput" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

                                    <div className="flex gap-4 w-full max-w-md mx-auto">
                                        <button
                                            onClick={() => document.getElementById('csvInput').click()}
                                            className="flex-1 py-3 bg-zuari-navy text-white rounded-2xl font-bold hover:bg-[#122856] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            {uploadFile ? uploadFile.name.substring(0, 15) + (uploadFile.name.length > 15 ? '...' : '') : 'Choose File'}
                                        </button>
                                        <button
                                            onClick={downloadEmployeeTemplate}
                                            className="flex-1 py-3 border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Template
                                        </button>
                                    </div>

                                    {uploadFile && (
                                        <button
                                            onClick={handleUpload} disabled={isSubmitting}
                                            className="w-full max-w-md mx-auto mt-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-900/20 disabled:opacity-70"
                                        >
                                            {isSubmitting ? 'Processing...' : 'Upload & Process'}
                                        </button>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ── Users Table ── */}
            <div className="w-full">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">All Users</h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Roles</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Entity</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Impact Level</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Gender</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                                    <th className="text-right py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {users.map((userItem) => {
                                    // entity / level / empCategory are now populated objects from the backend
                                    const entityObj = userItem.entity || null;
                                    const impactObj = userItem.level || null;
                                    const catObj = userItem.empCategory || null;

                                    return (
                                        <tr key={userItem._id} className="group hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            {/* Name */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold shadow-inner">
                                                        {userItem.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 dark:text-white">{userItem.name}</div>
                                                        <div className="text-xs text-gray-400">{userItem.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Roles */}
                                            <td className="py-4 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(userItem.roles || []).map(role => {
                                                        const colorMap = {
                                                            employee: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
                                                            admin: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                                                            superAdmin: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
                                                        };
                                                        const labelMap = { employee: 'Employee', admin: 'Admin', superAdmin: 'Super Admin' };
                                                        return (
                                                            <span key={role} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorMap[role] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                                                {labelMap[role] || role}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* Entity */}
                                            <td className="py-4 px-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                                    {entityObj?.name
                                                        ? `${entityObj.name} (${entityObj.entityCode})`
                                                        : '—'}
                                                </span>
                                            </td>

                                            {/* Impact Level */}
                                            <td className="py-4 px-4">
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                                                    {impactObj?.name || '—'}
                                                </span>
                                            </td>

                                            {/* Employee Category */}
                                            <td className="py-4 px-4">
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                                    {catObj?.name ? `${catObj.name} (${catObj.code})` : '—'}
                                                </span>
                                            </td>

                                            {/* Gender */}
                                            <td className="py-4 px-4">
                                                <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">
                                                    {userItem.gender || '—'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${userItem.status === 'inactive'
                                                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                    : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800'
                                                    }`}>
                                                    {userItem.status === 'inactive' ? 'Inactive' : 'Active'}
                                                </span>
                                            </td>

                                            {/* Created */}
                                            <td className="py-4 px-4">
                                                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                                    {new Date(userItem.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={() => handleEditClick(userItem)}
                                                    className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all mr-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => confirmDeleteUser(userItem._id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-gray-400">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminEmployees;
