import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle } from 'react-icons/fi';
import { getMyTickets, raiseTicket as raiseTicketApi, getEmployeeQuestionThemes, evaluateIndependentTicket, generateTicketFields } from '../api';
import TicketChatModal from './TicketChatModal';

const STATUS_COLORS = {
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'hold': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const STATUS_LABELS = {
    open: 'Open',
    'hold': 'Hold',
    resolved: 'Resolved',
};

const TicketDetailModal = ({ ticket, onClose }) => {
    if (!ticket) return null;

    if (!ticket) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg mx-4 animate-up max-h-[88vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">{ticket.ticketNumber || 'Ticket'}</h2>
                            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}>
                                {STATUS_LABELS[ticket.status] || ticket.status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.subject || ticket.userQuestion || ''}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all shrink-0 ml-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Category</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{ticket.themeName}</p>
                    </div>
                    {ticket.userQuestion && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Your Question</p>
                            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{ticket.userQuestion}</div>
                        </div>
                    )}
                    {ticket.description && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Description</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">{ticket.description}</p>
                        </div>
                    )}
                    {ticket.aiResponse && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">AI Response</p>
                            <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-h-40 overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: ticket.aiResponse }} />
                        </div>
                    )}
                    {ticket.hrResponse ? (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">HR Response</p>
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl px-4 py-3 text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{ticket.hrResponse}</div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                            Awaiting HR response.
                        </div>
                    )}
                    <div className="text-xs text-gray-400">
                        Created: {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MyTickets = ({ onBack }) => {
    const [showRaiseModal, setShowRaiseModal] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [chatTicket, setChatTicket] = useState(null);

    // Raise form state
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ subject: '', categoryId: '', description: '' });
    const [raising, setRaising] = useState(false);
    const [raiseError, setRaiseError] = useState('');
    const [raiseSuccess, setRaiseSuccess] = useState(null);

    // AI field generation states
    const [fieldsGenerated, setFieldsGenerated] = useState(false);
    const [generatingFields, setGeneratingFields] = useState(false);

    // QA evaluation states
    const [qaModal, setQaModal] = useState(false);
    const [qaEvaluation, setQaEvaluation] = useState(null);
    const [qaEvaluating, setQaEvaluating] = useState(false);
    const [qaError, setQaError] = useState('');

    const fetchTickets = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const filters = {};
            if (statusFilter) filters.status = statusFilter;
            if (categoryFilter) filters.category = categoryFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            const result = await getMyTickets(filters);
            setTickets(result.data || []);
        } catch (e) {
            console.error('Failed to fetch tickets:', e);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, [statusFilter, categoryFilter, startDate, endDate]);

    // Poll tickets every 5 seconds for near real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchTickets(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [statusFilter, categoryFilter, startDate, endDate]);

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

    const getWordCount = (text) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    const handleGenerateFields = async (e) => {
        e.preventDefault();
        const wordCount = getWordCount(form.description);
        if (wordCount < 25) {
            setRaiseError(`Description must be at least 25 words (current: ${wordCount})`);
            return;
        }
        setRaiseError('');
        setGeneratingFields(true);
        try {
            const fields = await generateTicketFields({ description: form.description });
            setForm(f => ({
                ...f,
                subject: fields.subject || '',
                categoryId: fields.categoryId || '',
            }));
            setFieldsGenerated(true);
        } catch (err) {
            setRaiseError(err.message || 'Failed to generate fields. Please fill them manually.');
            setFieldsGenerated(true);
        } finally {
            setGeneratingFields(false);
        }
    };

    const handleRaiseSubmit = async (e) => {
        e.preventDefault();
        if (!form.categoryId) { setRaiseError('Category is required'); return; }
        if (!form.subject.trim()) { setRaiseError('Subject is required'); return; }
        
        const wordCount = getWordCount(form.description);
        if (wordCount < 25) {
            setRaiseError(`Description must be at least 25 words (current: ${wordCount})`);
            return;
        }
        setRaiseError('');

        // Start QA evaluation
        setQaModal(true);
        setQaEvaluation(null);
        setQaError('');
        setQaEvaluating(true);
        try {
            const result = await evaluateIndependentTicket({
                subject: form.subject,
                description: form.description,
            });
            setQaEvaluation(result);
        } catch (err) {
            setQaError(err.message || 'Evaluation failed.');
        } finally {
            setQaEvaluating(false);
        }
    };

    const proceedToRaise = async () => {
        setQaModal(false);
        setQaEvaluation(null);
        setQaError('');
        setRaising(true);
        setRaiseError('');
        try {
            const ticket = await raiseTicketApi({
                subject: form.subject,
                description: form.description,
                categoryId: form.categoryId || undefined,
            });
            setRaiseSuccess(ticket);
            setForm({ subject: '', categoryId: '', description: '' });
            fetchTickets();
        } catch (e) {
            setRaiseError(e.message || 'Failed to raise ticket');
        } finally {
            setRaising(false);
        }
    };

    const closeRaiseModal = () => {
        setShowRaiseModal(false);
        setRaiseSuccess(null);
        setRaiseError('');
        setForm({ subject: '', categoryId: '', description: '' });
        setFieldsGenerated(false);
        setGeneratingFields(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
            {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
            {chatTicket && <TicketChatModal ticket={chatTicket} onClose={() => { setChatTicket(null); fetchTickets(); }} userRole="employee" />}

            {/* Raise Ticket Modal */}
            {showRaiseModal && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg mx-4 animate-up max-h-[88vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Raise a Ticket</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Submit a new support request to the HR team</p>
                                </div>
                            </div>
                            <button onClick={closeRaiseModal} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all shrink-0 ml-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                            {raiseSuccess ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ticket Raised Successfully!</h2>
                                    {raiseSuccess.ticketNumber && (
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 mb-4 inline-block">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket ID</span>
                                            <p className="text-lg font-black text-zuari-navy dark:text-blue-400">{raiseSuccess.ticketNumber}</p>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">An HROps representative will review your ticket and follow up.</p>
                                    <div className="flex gap-3 justify-center">
                                        <button onClick={closeRaiseModal} className="px-5 py-2.5 rounded-xl bg-zuari-navy text-white text-sm font-bold hover:bg-[#122856] transition-all">
                                            Close
                                        </button>
                                        <button onClick={() => { setRaiseSuccess(null); setForm({ subject: '', categoryId: '', description: '' }); setFieldsGenerated(false); }} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                                            Raise Another
                                        </button>
                                    </div>
                                </div>
                            ) : !fieldsGenerated ? (
                                <form onSubmit={handleGenerateFields} className="space-y-4">
                                    {/* Description only - Step 1 */}
                                    <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl px-4 py-3">
                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Describe your issue and AI will auto-fill the other fields for you.</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Description <span className="text-red-400">*</span></label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="Describe your issue or request in detail..."
                                            rows={5}
                                            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white text-sm p-3 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none transition-all"
                                        />
                                    </div>

                                    {raiseError && <p className="text-xs text-red-500">{raiseError}</p>}

                                    <button
                                        type="submit"
                                        disabled={generatingFields}
                                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all disabled:opacity-70 shadow-md flex items-center justify-center gap-2"
                                    >
                                        {generatingFields ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Generating Fields...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                Generate Fields with AI
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleRaiseSubmit} className="space-y-4">
                                    {/* Description (read-only summary) */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Description</label>
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar">{form.description}</div>
                                    </div>

                                    {/* AI-generated: Subject (editable) */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject <span className="text-red-400">*</span></label>
                                            <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">AI Generated</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={form.subject}
                                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                            placeholder="Brief summary of your issue"
                                            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white text-sm p-3 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                                            maxLength={200}
                                        />
                                    </div>

                                    {/* AI-generated: Category (editable) */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category <span className="text-red-400">*</span></label>
                                            <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">AI Generated</span>
                                        </div>
                                        <select
                                            value={form.categoryId}
                                            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                                            required
                                            className={`w-full rounded-xl border ${!form.categoryId && raiseError === 'Category is required' ? 'border-red-400 ring-2 ring-red-400/30' : 'border-gray-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-gray-800 dark:text-white text-sm p-3 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all`}
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map(cat => (
                                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {raiseError && <p className="text-xs text-red-500">{raiseError}</p>}

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setFieldsGenerated(false); setRaiseError(''); }}
                                            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={raising}
                                            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all disabled:opacity-70 shadow-md"
                                        >
                                            {raising ? 'Submitting...' : 'Submit Ticket'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* QA Evaluation Modal */}
            {qaModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md mx-4 p-6 animate-up relative">
                        <button onClick={() => { setQaModal(false); setQaEvaluation(null); setQaError(''); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quality Check</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Checking if your query can be answered by our policies</p>
                            </div>
                        </div>

                        {qaEvaluating ? (
                            <div className="py-8 text-center">
                                <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Analyzing your request...</p>
                                <p className="text-xs text-gray-400 mt-1">Checking against company policies</p>
                            </div>
                        ) : qaError ? (
                            <div className="py-6">
                                <p className="text-sm text-red-500 mb-4">{qaError}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => { setQaModal(false); setQaError(''); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                    <button onClick={proceedToRaise} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all">Proceed Anyway</button>
                                </div>
                            </div>
                        ) : qaEvaluation ? (
                            <div>
                                <div className={`rounded-xl p-4 mb-4 border ${qaEvaluation.necessary ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'}`}>
                                    <div className="flex items-start gap-3">
                                        {qaEvaluation.necessary ? (
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                        <div>
                                            <p className={`text-sm font-bold ${qaEvaluation.necessary ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
                                                {qaEvaluation.necessary ? 'Ticket may be needed' : 'This may already be covered by our policies'}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {qaEvaluation.necessary 
                                                    ? qaEvaluation.reason 
                                                    : "That AI response is sufficient and we don't feel there is any query that needs to be raised. If you still feel the need to raise a ticket pls click on raise anyway below button then click on raise a ticket"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {!qaEvaluation.necessary && qaEvaluation.suggestion && (
                                    <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl px-4 py-3 mb-4">
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Suggestion</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">{qaEvaluation.suggestion}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => { setQaModal(false); setQaEvaluation(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                                        {qaEvaluation.necessary ? 'Cancel' : 'Got it, no ticket needed'}
                                    </button>
                                    <button onClick={proceedToRaise} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all">
                                        {qaEvaluation.necessary ? 'Proceed to Raise Ticket' : 'Raise Anyway'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all text-gray-500 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white">My Tickets</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Track and manage your support requests</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="w-full">
                        <div className="space-y-6">
                            {/* Filters Bar */}
                            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Status</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {['', 'open', 'hold', 'resolved'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatusFilter(s)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${statusFilter === s ? 'bg-zuari-navy text-white border-zuari-navy shadow-md' : 'bg-transparent text-gray-500 border-gray-100 dark:border-slate-700 hover:border-gray-200'}`}
                                                >
                                                    {s === '' ? 'All' : STATUS_LABELS[s]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto min-w-[180px]">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Category</label>
                                        <select
                                            value={categoryFilter}
                                            onChange={e => setCategoryFilter(e.target.value)}
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
                                                onChange={e => setStartDate(e.target.value)}
                                                className="flex-1 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-xs font-bold p-2.5 outline-none"
                                            />
                                            <span className="text-gray-400">to</span>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="flex-1 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 text-xs font-bold p-2.5 outline-none"
                                            />
                                            {(startDate || endDate) && (
                                                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => { setShowRaiseModal(true); setRaiseSuccess(null); setRaiseError(''); }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Raise a Ticket
                                </button>
                            </div>

                            {loading ? (
                                <div className="p-12 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm animate-pulse">Loading tickets...</div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                    </div>
                                    <p className="text-gray-500 font-bold">No tickets found</p>
                                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or raise a new ticket.</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ticket</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Raised On</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Closure</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Messages</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tickets.map(ticket => (
                                                    <tr key={ticket._id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-xs font-mono font-bold text-zuari-navy dark:text-blue-400">{ticket.ticketNumber}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[150px]" title={ticket.subject || ticket.userQuestion}>
                                                                {ticket.subject || ticket.userQuestion || 'No subject'}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={ticket.description}>
                                                                {ticket.description || 'No description'}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                                {ticket.themeName}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_COLORS[ticket.status]}`}>
                                                                {STATUS_LABELS[ticket.status] || ticket.status}
                                                            </span>
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
                            )}
                        </div>
                </div>
            </div>
        </div>
    );
};

export default MyTickets;
