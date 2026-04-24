import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  CheckCircle2, 
  Zap, 
  Clock, 
  UserCheck, 
  FileText 
} from 'lucide-react';
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

    // Raise form state (Premium)
    const [categories, setCategories] = useState([]);
    const [intent, setIntent] = useState('');
    const [regarding, setRegarding] = useState('');
    const [story, setStory] = useState('');
    const [raiseModalView, setRaiseModalView] = useState('form'); // 'form' | 'preview' | 'success'
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState({ subject: '', description: '', categoryName: '', categoryId: '' });
    const [showForceSubmit, setShowForceSubmit] = useState(false);
    
    const [raising, setRaising] = useState(false);
    const [raiseError, setRaiseError] = useState('');
    const [raiseSuccessTicket, setRaiseSuccessTicket] = useState(null);

    // QA evaluation states
    const [qaEvaluation, setQaEvaluation] = useState(null);
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

    const handleRaisePreview = async () => {
        setRaiseError('');
        
        if (regarding.length < 30) {
            setRaiseError(`Regarding must be at least 30 characters (current: ${regarding.length})`);
            return;
        }

        if (story.length < 100) {
            setRaiseError(`Story must be at least 100 characters (current: ${story.length})`);
            return;
        }

        setIsGeneratingAi(true);
        const fullDescription = `I want to: ${intent}\nRegarding: ${regarding}\nStory: ${story}`;

        try {
            // 1. Synthesize Subject and Category
            const synthesis = await generateTicketFields({ description: fullDescription });
            
            // 2. Perform Policy Evaluation (QA Check)
            const evaluation = await evaluateIndependentTicket({ 
                subject: synthesis.subject, 
                description: fullDescription 
            });

            // Find category name for display
            const cat = categories.find(c => c._id === synthesis.categoryId);
            
            setAiAnalysis({
                subject: synthesis.subject,
                description: synthesis.description, // Store AI professional description
                categoryName: cat ? cat.name : "Other",
                categoryId: synthesis.categoryId
            });
            setQaEvaluation(evaluation);
            setShowForceSubmit(false); // Reset confirmation state
            setRaiseModalView('preview');
        } catch (err) {
            setRaiseError(err.message || 'Failed to analyze ticket. Please try again.');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleRaiseSubmit = async () => {
        setRaising(true);
        setRaiseError('');
        const fullDescription = `I want to: ${intent}\nRegarding: ${regarding}\nStory: ${story}`;

        try {
            const ticket = await raiseTicketApi({
                subject: aiAnalysis.subject,
                categoryId: aiAnalysis.categoryId || undefined,
                description: aiAnalysis.description // Use the edited/generated professional description
            });
            setRaiseSuccessTicket(ticket);
            setRaiseModalView('success');
            fetchTickets(true);
        } catch (e) {
            setRaiseError(e.message || 'Failed to raise ticket.');
        } finally {
            setRaising(false);
        }
    };

    const closeRaiseModal = () => {
        setShowRaiseModal(false);
        setRaiseModalView('form');
        setIntent('');
        setRegarding('');
        setStory('');
        setRaiseError('');
        setQaEvaluation(null);
        setRaiseSuccessTicket(null);
        setShowForceSubmit(false);
        setAiAnalysis({ subject: '', description: '', categoryName: '', categoryId: '' });
    };

    const handleBackToForm = () => {
        setRaiseModalView('form');
    };

    const getWordCount = (text) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    const isFormValid = intent && regarding.trim().length >= 30 && story.trim().length >= 100;

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
            {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
            {chatTicket && <TicketChatModal ticket={chatTicket} onClose={() => { setChatTicket(null); fetchTickets(); }} userRole="employee" />}

            {/* Raise Ticket Modal */}
            {showRaiseModal && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-up">
                        
                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Raise a Ticket</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI-assisted HR support request</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-2xl">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H10" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <button onClick={closeRaiseModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Step 1: Form Input */}
                        {raiseModalView === 'form' && (
                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">I want to...</label>
                                    <div className="relative">
                                        <select
                                            value={intent}
                                            onChange={(e) => setIntent(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-slate-700 rounded-2xl px-4 py-3.5 outline-none transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-200 font-medium"
                                        >
                                            <option value="" disabled>Choose an action</option>
                                            <option value="Ask a Question">Ask a Question</option>
                                            <option value="Report an Error">Report an Error</option>
                                            <option value="Request an Action">Request an Action</option>
                                            <option value="Escalate an Issue">Escalate an Issue</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronLeft size={16} className="-rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Regarding</label>
                                        <span className={`text-[10px] font-medium ${regarding.length >= 30 ? 'text-green-500' : 'text-slate-400'}`}>
                                            {regarding.length}/60
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={60}
                                        placeholder="e.g. October Payslip, Laptop, Annual Leave"
                                        value={regarding}
                                        onChange={(e) => setRegarding(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-slate-700 rounded-2xl px-4 py-3.5 outline-none transition-all text-slate-700 dark:text-slate-200"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tell us the story...</label>
                                        <span className={`text-[10px] font-medium ${story.length >= 100 ? 'text-green-500' : 'text-slate-400'}`}>
                                            {story.length}/600
                                        </span>
                                    </div>
                                    <textarea
                                        maxLength={600}
                                        placeholder="Describe your issue or request in detail (min 100 chars)"
                                        rows="4"
                                        value={story}
                                        onChange={(e) => setStory(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-slate-700 rounded-2xl px-4 py-3.5 outline-none transition-all resize-none text-slate-700 dark:text-slate-200 leading-relaxed"
                                    ></textarea>
                                </div>

                                {raiseError && <p className="text-xs text-red-500 ml-1">{raiseError}</p>}

                                <button
                                    onClick={handleRaisePreview}
                                    disabled={!isFormValid || isGeneratingAi}
                                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl shadow-orange-200 dark:shadow-none transition-all flex items-center justify-center space-x-2 ${
                                        isFormValid ? 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98]' : 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed shadow-none text-slate-400'
                                    }`}
                                >
                                    {isGeneratingAi ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Continue to Analysis</span>
                                            <ChevronRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                        {/* Step 2: AI Preview & Quality Check */}
                        {raiseModalView === 'preview' && (
                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-4 flex items-start space-x-3">
                                        <Zap size={18} className="text-indigo-500 mt-0.5 fill-indigo-500/20" />
                                        <div>
                                            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">AI Synthesis Complete</p>
                                            <p className="text-xs text-indigo-700/70 dark:text-indigo-400">Review and refine the generated ticket details below.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Editable Subject */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subject</label>
                                            <input
                                                type="text"
                                                value={aiAnalysis.subject}
                                                onChange={(e) => setAiAnalysis({ ...aiAnalysis, subject: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all text-slate-800 dark:text-white font-bold"
                                            />
                                        </div>

                                        {/* Editable Category */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Routing Category</label>
                                            <div className="relative">
                                                <select
                                                    value={aiAnalysis.categoryId}
                                                    onChange={(e) => {
                                                        const cat = categories.find(c => c._id === e.target.value);
                                                        setAiAnalysis({ ...aiAnalysis, categoryId: e.target.value, categoryName: cat ? cat.name : "Other" });
                                                    }}
                                                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all text-slate-700 dark:text-slate-200 font-semibold appearance-none cursor-pointer"
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <ChevronLeft size={16} className="-rotate-90" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Editable Professional Description */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Professional Description</label>
                                                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-tighter">AI Optimized</span>
                                            </div>
                                            <textarea
                                                rows="5"
                                                value={aiAnalysis.description}
                                                onChange={(e) => setAiAnalysis({ ...aiAnalysis, description: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all text-slate-700 dark:text-slate-200 text-sm leading-relaxed resize-none custom-scrollbar"
                                            ></textarea>
                                        </div>
                                    </div>

                                    {/* Policy Check Results */}
                                    {qaEvaluation && (
                                        <div className={`p-5 rounded-2xl border ${qaEvaluation.necessary ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/20' : 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/20'}`}>
                                            <div className="flex items-start space-x-3">
                                                {qaEvaluation.necessary ? <Clock size={16} className="text-amber-500 mt-0.5" /> : <CheckCircle2 size={16} className="text-green-500 mt-0.5" />}
                                                <div>
                                                    <p className={`text-sm font-bold ${qaEvaluation.necessary ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
                                                        {qaEvaluation.necessary ? 'Quality Check Passed' : 'Potential Resolution Found'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                        {qaEvaluation.necessary ? qaEvaluation.reason : "AI identified a possible answer in company policies. You can still proceed if you need human assistance."}
                                                    </p>
                                                    {!qaEvaluation.necessary && qaEvaluation.preciseAnswer && (
                                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200">AI Answer:</span> {qaEvaluation.preciseAnswer}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {raiseError && <p className="text-xs text-red-500 ml-1">{raiseError}</p>}

                                {qaEvaluation && !qaEvaluation.necessary && !showForceSubmit ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={closeRaiseModal}
                                            className="flex-1 py-4 px-2 rounded-2xl font-bold border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            <span className="text-lg leading-none">👍</span>
                                            <span>This helped</span>
                                        </button>
                                        <button
                                            onClick={() => setShowForceSubmit(true)}
                                            className="flex-1 py-4 px-2 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            <span className="text-lg leading-none">❓</span>
                                            <span>Still need help</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={handleBackToForm}
                                            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center space-x-2"
                                        >
                                            <ChevronLeft size={18} />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={handleRaiseSubmit}
                                            disabled={raising}
                                            className="flex-[2] py-4 rounded-2xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-200 dark:shadow-none transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                                        >
                                            {raising ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <span>Confirm & Submit</span>
                                                    <Send size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Success View */}
                        {raiseModalView === 'success' && raiseSuccessTicket && (
                            <div className="p-8 animate-in zoom-in-95 duration-500 text-center">
                                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-green-100 dark:border-green-800/30">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ticket #{raiseSuccessTicket.ticketNumber}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Successfully submitted to the {aiAnalysis.categoryName} Team.</p>

                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 text-left border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">What happens next?</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg mt-0.5 border border-slate-100 dark:border-slate-800">
                                                <UserCheck size={14} className="text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Smart Routing</p>
                                                <p className="text-xs text-slate-500 leading-relaxed">The AI is assigning your request to a specialist in {aiAnalysis.categoryName}.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg mt-0.5 border border-slate-100 dark:border-slate-800">
                                                <FileText size={14} className="text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Policy Pre-Fetching</p>
                                                <p className="text-xs text-slate-500 leading-relaxed">Relevant company documents have been attached to help the agent respond faster.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={closeRaiseModal}
                                    className="w-full mt-8 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        )}
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
