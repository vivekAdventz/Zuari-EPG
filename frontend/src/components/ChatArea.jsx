import React, { useRef, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import manImg from '../assets/man.png';
import womanImg from '../assets/woman.png';
import { submitFeedback, raiseTicket as raiseTicketApi, evaluateTicket as evaluateTicketApi } from '../api';

const RaiseTicketModal = ({ question, answer, onClose, onRaise }) => {
    const [raising, setRaising] = useState(false);
    const [error, setError] = useState('');
    const [desc, setDesc] = useState('');

    const handleRaise = async () => {
        if (!desc.trim()) {
            setError('Description is required. Please explain what you need help with.');
            return;
        }
        setRaising(true);
        setError('');
        try {
            await onRaise(desc);
        } catch (e) {
            setError(e.message || 'Failed to raise ticket. Please try again.');
            setRaising(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg mx-4 p-6 animate-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Raise a Support Ticket</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Review the response below before raising a ticket</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* User Question */}
                <div className="mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Your Question</p>
                    <div className="bg-zuari-navy/5 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 font-medium">
                        {question}
                    </div>
                </div>

                {/* AI Response */}
                <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">AskHR's Response</p>
                    <div
                        className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-h-44 overflow-y-auto custom-scrollbar prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answer) }}
                    />
                </div>

                {/* Confirmation text */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    AskHR has provided the response above. Are you still not satisfied and want to raise a ticket?
                    An <span className="font-semibold text-gray-700 dark:text-gray-200">HROps representative</span> will review and follow up with you.
                </p>

                {/* Description */}
                <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description <span className="text-red-400">*</span></p>
                    <textarea
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white text-sm p-3 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none transition-all"
                        rows={3}
                        placeholder="Describe what you need help with..."
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                    />
                </div>

                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRaise}
                        disabled={raising}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all disabled:opacity-70"
                    >
                        {raising ? 'Raising...' : 'Raise Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TicketSuccessModal = ({ ticket, onClose }) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md mx-4 p-6 animate-up text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ticket Raised Successfully!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Your ticket has been submitted and assigned to an HROps representative who will review and follow up.
            </p>
            {ticket?.ticketNumber && (
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 mb-4 inline-block">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket ID</span>
                    <p className="text-lg font-black text-zuari-navy dark:text-blue-400">{ticket.ticketNumber}</p>
                </div>
            )}
            <div className="text-xs text-gray-400 mb-5">
                You can track the status of your ticket in the <span className="font-semibold text-gray-600 dark:text-gray-300">Tickets</span> section from the sidebar.
            </div>
            <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-zuari-navy hover:bg-[#122856] text-white text-sm font-semibold transition-all"
            >
                Got it
            </button>
        </div>
    </div>
);

const TicketQAModal = ({ evaluation, evaluating, error, onProceed, onClose }) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md mx-4 p-6 animate-up relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quality Check</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Evaluating your request before raising a ticket</p>
                </div>
            </div>

            {evaluating ? (
                <div className="py-8 text-center">
                    <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Analyzing your conversation...</p>
                    <p className="text-xs text-gray-400 mt-1">Our AI is checking if a ticket is needed</p>
                </div>
            ) : error ? (
                <div className="py-6">
                    <p className="text-sm text-red-500 mb-4">{error}</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                        <button onClick={onProceed} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all">Proceed Anyway</button>
                    </div>
                </div>
            ) : evaluation ? (
                <div>
                    {/* Result indicator */}
                    <div className={`rounded-xl p-4 mb-4 border ${evaluation.necessary ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'}`}>
                        <div className="flex items-start gap-3">
                            {evaluation.necessary ? (
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                            <div>
                                <p className={`text-sm font-bold ${evaluation.necessary ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
                                    {evaluation.necessary ? 'Ticket may be needed' : 'AI response seems sufficient'}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {evaluation.necessary 
                                        ? evaluation.reason 
                                        : "That AI response is sufficient and we don't feel there is any query that needs to be raised. If you still feel the need to raise a ticket pls click on raise anyway below button then click on raise a ticket"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Suggestion (when ticket not necessary) */}
                    {!evaluation.necessary && evaluation.suggestion && (
                        <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl px-4 py-3 mb-4">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Suggestion</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">{evaluation.suggestion}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                            {evaluation.necessary ? 'Cancel' : 'Got it, no ticket needed'}
                        </button>
                        <button onClick={onProceed} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all">
                            {evaluation.necessary ? 'Proceed to Raise Ticket' : 'Raise Anyway'}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    </div>
);

const ChatArea = ({
    messages, isLoading, onSendMessage, user, toggleSidebar,
    toggleDarkMode, dynamicFaqs, isFaqLoading,
    selectedPolicyTitle, setSelectedPolicyTitle, availablePolicies,
    initialFeedbackIds, initialTicketMap, onOpenTickets
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    // Feedback states
    const [feedbackMap, setFeedbackMap] = useState({}); // msgId -> 'up'
    const [submittedSet, setSubmittedSet] = useState(new Set()); // msgIds with submitted thumbs-up
    // Ticket states
    const [ticketModal, setTicketModal] = useState(null); // { msgId, queryId, responseId, question, answer }
    const [ticketRaisedMap, setTicketRaisedMap] = useState({}); // msgId -> ticketNumber
    const [successTicket, setSuccessTicket] = useState(null); // ticket data for success modal
    // QA evaluation states
    const [qaModal, setQaModal] = useState(null); // { msgId, queryId, responseId, question, answer }
    const [qaEvaluation, setQaEvaluation] = useState(null);
    const [qaEvaluating, setQaEvaluating] = useState(false);
    const [qaError, setQaError] = useState('');

    // Populate persisted feedback & ticket states from backend
    useEffect(() => {
        if (initialFeedbackIds?.length) {
            const newFeedback = {};
            const newSubmitted = new Set();
            initialFeedbackIds.forEach(id => {
                newFeedback[id] = 'up';
                newSubmitted.add(id);
            });
            setFeedbackMap(newFeedback);
            setSubmittedSet(newSubmitted);
        } else {
            setFeedbackMap({});
            setSubmittedSet(new Set());
        }
        if (initialTicketMap?.length) {
            const map = {};
            initialTicketMap.forEach(t => { map[t.responseId] = t.ticketNumber; });
            setTicketRaisedMap(map);
        } else {
            setTicketRaisedMap({});
        }
    }, [initialFeedbackIds, initialTicketMap]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
            const textarea = e.target.tagName === 'TEXTAREA' ? e.target : e.target.querySelector('textarea');
            if (textarea) textarea.style.height = '56px';
        }
    };

    const handleSuggestion = (text) => {
        onSendMessage(text);
    };

    // Find the user message that precedes a given ai message index
    const getRelatedUserMessage = (msgIndex) => {
        for (let i = msgIndex - 1; i >= 0; i--) {
            if (messages[i].role === 'user') return messages[i];
        }
        return null;
    };

    const handleThumb = async (msg, msgIndex, thumbType) => {
        const msgId = msg._id || msg.id;
        if (submittedSet.has(msgId)) return;
        setFeedbackMap(prev => ({ ...prev, [msgId]: thumbType }));
        const userMsg = getRelatedUserMessage(msgIndex);
        try {
            await submitFeedback({
                queryId: userMsg?._id || userMsg?.id,
                responseId: msg._id || msg.id,
                userQuestion: userMsg?.content || '',
                aiResponse: msg.content,
                thumbs: thumbType,
                description: ''
            });
            setSubmittedSet(prev => new Set([...prev, msgId]));
        } catch (e) {
            console.error('Feedback error:', e);
        }
    };

    const handleTicketClick = async (msg, msgIndex) => {
        const msgId = msg._id || msg.id;
        const userMsg = getRelatedUserMessage(msgIndex);
        const ticketData = {
            msgId,
            queryId: userMsg?._id || userMsg?.id,
            responseId: msg._id || msg.id,
            question: userMsg?.content || '',
            answer: msg.content,
        };

        const aiResponseLower = (msg.content || '').toLowerCase();
        if (aiResponseLower.includes('not covered') || aiResponseLower.includes('not available for your employee profile')) {
            setTicketModal(ticketData);
            return;
        }

        // Open QA evaluation modal and start evaluation
        setQaModal(ticketData);
        setQaEvaluation(null);
        setQaError('');
        setQaEvaluating(true);

        try {
            // Build conversation context for evaluation
            const conversationMessages = messages.map(m => ({
                role: m.role,
                content: (m.content || '').replace(/<[^>]*>/g, '').substring(0, 500),
            }));

            const result = await evaluateTicketApi({
                conversationMessages,
                userQuestion: userMsg?.content || '',
                aiResponse: (msg.content || '').replace(/<[^>]*>/g, '').substring(0, 2000),
                selectedPolicy: selectedPolicyTitle || '',
            });
            setQaEvaluation(result);
        } catch (e) {
            setQaError(e.message || 'Evaluation failed.');
        } finally {
            setQaEvaluating(false);
        }
    };

    const handleQaClose = async () => {
        // If AI response was sufficient and user clicks "Got it, no ticket needed", auto thumbs-up
        if (qaEvaluation && !qaEvaluation.necessary && qaModal) {
            const { msgId, queryId, responseId, question, answer } = qaModal;
            if (!submittedSet.has(msgId)) {
                setFeedbackMap(prev => ({ ...prev, [msgId]: 'up' }));
                try {
                    await submitFeedback({
                        queryId,
                        responseId,
                        userQuestion: question || '',
                        aiResponse: answer || '',
                        thumbs: 'up',
                        description: ''
                    });
                    setSubmittedSet(prev => new Set([...prev, msgId]));
                } catch (e) {
                    console.error('Auto-feedback error:', e);
                }
            }
        }
        setQaModal(null);
        setQaEvaluation(null);
        setQaError('');
    };

    const handleQaProceed = () => {
        // If AI was sufficient but user clicks "Raise Anyway", go to tickets tab
        if (qaEvaluation && !qaEvaluation.necessary) {
            setQaModal(null);
            setQaEvaluation(null);
            setQaError('');
            onOpenTickets?.();
            return;
        }
        // Otherwise (ticket necessary or error flow), open RaiseTicketModal
        setTicketModal(qaModal);
        setQaModal(null);
        setQaEvaluation(null);
        setQaError('');
    };

    const handleRaiseTicket = async (description) => {
        if (!ticketModal) return;
        const ticket = await raiseTicketApi({
            queryId: ticketModal.queryId,
            responseId: ticketModal.responseId,
            userQuestion: ticketModal.question,
            aiResponse: ticketModal.answer,
            description: description || '',
        });
        setTicketRaisedMap(prev => ({ ...prev, [ticketModal.msgId]: ticket.ticketNumber }));
        setTicketModal(null);
        setSuccessTicket(ticket);
    };

    const displayFaqs = dynamicFaqs?.length > 0 ? dynamicFaqs.slice(0, 8) : [];

    const faqStyles = [
        {
            bg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-500',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        },
        {
            bg: 'bg-green-50 dark:bg-green-900/30 text-green-500',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        },
        {
            bg: 'bg-orange-50 dark:bg-orange-900/30 text-orange-500',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        },
        {
            bg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-500',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        }
    ];

    const homeView = (
        <div id="homeView" className="w-full max-w-5xl mx-auto px-8 mb-4 animate-up h-full flex flex-col justify-center">
            <div className="text-left w-full flex flex-col items-start">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[#1d52d9] shadow-lg shadow-blue-900/10 flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none mb-1">AskHR</h1>
                        <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest">AI Policy Assistant</span>
                    </div>
                </div>

                <h2 id="dynamicGreeting" className="text-4xl font-black mb-3 tracking-tight text-[var(--text-main)]">
                    Hello, <span className="text-blue-600">{user?.name?.split(' ')[0] || 'Employee'}</span>.
                </h2>
                <p className="text-gray-400 font-medium text-lg max-w-xl">How can I assist you with company policies today?</p>

                <div className="mt-6 inline-flex items-center gap-2 bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-100 dark:border-blue-800/30 shadow-sm">
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    <span>Please choose a policy from the left sidebar to chat with!</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
            {/* QA Evaluation Modal */}
            {qaModal && (
                <TicketQAModal
                    evaluation={qaEvaluation}
                    evaluating={qaEvaluating}
                    error={qaError}
                    onProceed={handleQaProceed}
                    onClose={handleQaClose}
                />
            )}

            {/* Raise Ticket Modal */}
            {ticketModal && (
                <RaiseTicketModal
                    question={ticketModal.question}
                    answer={ticketModal.answer}
                    onClose={() => setTicketModal(null)}
                    onRaise={handleRaiseTicket}
                />
            )}

            {/* Ticket Success Modal */}
            {successTicket && (
                <TicketSuccessModal
                    ticket={successTicket}
                    onClose={() => setSuccessTicket(null)}
                />
            )}

            {/* Header Removed */}
            <div className="absolute top-4 left-4 z-50 md:hidden">
                <button onClick={toggleSidebar} className="p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            </div>

            {/* Chat History / Home View */}
            <div id="chatHistory" className={`flex-1 overflow-y-auto custom-scrollbar pt-16 md:pt-8 pb-4 ${messages.length === 0 ? 'flex flex-col justify-center' : ''}`} ref={scrollRef}>
                {messages.length === 0 ? homeView : (
                    <div className="max-w-6xl mx-auto px-3 md:px-6 space-y-6 md:space-y-8 pb-4 w-full">
                        {messages.map((msg, msgIndex) => {
                            const isAI = msg.role === 'ai' || msg.role === 'assistant';
                            const msgId = msg._id || msg.id;
                            const currentThumb = feedbackMap[msgId];

                            return (
                                <div key={msgId} className={`flex gap-3 md:gap-6 animate-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg ${isAI ? 'bg-zuari-navy shadow-lg' : (user?.gender === 'Female' || user?.gender === 'Male' ? '' : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm')} shrink-0 flex items-center justify-center`}>
                                        {isAI ? (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        ) : (
                                            user?.gender === 'Female' ? (
                                                <img src={womanImg} alt="User Avatar" className="w-full h-full object-cover rounded-lg" />
                                            ) : user?.gender === 'Male' ? (
                                                <img src={manImg} alt="User Avatar" className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <span className="text-[9px] font-black text-gray-400">YOU</span>
                                            )
                                        )}
                                    </div>

                                    <div className="space-y-1 pt-1 max-w-[calc(100%-3rem)] md:max-w-[85%] min-w-0">
                                        <div className={`p-4 rounded-2xl overflow-x-auto custom-scrollbar ${isAI ? 'glass text-[var(--text-main)] border border-gray-100 dark:border-slate-800' : 'bg-zuari-navy text-white shadow-md'}`}>
                                            <div className={`${msg.role === 'user' ? 'text-right' : 'font-medium'}`}>
                                                <div
                                                    className={`prose prose-sm max-w-none
                                                    ${msg.role === 'user' ? 'text-white prose-p:text-white prose-headings:text-white prose-strong:text-white prose-ul:text-white prose-li:text-white' : 'prose-p:text-[var(--text-main)] prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-ul:text-[var(--text-main)] prose-li:text-[var(--text-main)]'}
                                                    prose-li:marker:text-[var(--text-muted)]
                                                    prose-p:my-1 prose-headings:my-2 prose-ul:my-2 prose-li:my-0.5
                                                    dark:prose-invert`}
                                                    dangerouslySetInnerHTML={{ __html: msg.content }}
                                                />
                                            </div>
                                        </div>

                                        {/* Feedback & Ticket — only for AI messages */}
                                        {isAI && (
                                            <div className="flex items-center gap-2 pt-1 pl-1 flex-wrap">
                                                {/* Thumbs Feedback */}
                                                {submittedSet.has(msgId) ? (
                                                    <div title="Thanks for your feedback!" className={`flex items-center justify-center p-1.5 rounded-lg border text-xs ${currentThumb === 'down' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400' : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'}`}>
                                                        {currentThumb === 'down' ? (
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 11V4m-7 10h2m-2-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.904 0 .715-.211 1.413-.608 2.008L7 13v7m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            title="Mark as helpful"
                                                            onClick={() => handleThumb(msg, msgIndex, 'up')}
                                                            className="flex items-center justify-center p-1.5 rounded-lg border text-xs font-semibold transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-green-300 hover:text-green-600"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.904 0 .715-.211 1.413-.608 2.008L7 13v7m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                            </svg>
                                                        </button>
                                                        
                                                        <button
                                                            title="Mark as unhelpful"
                                                            onClick={() => handleThumb(msg, msgIndex, 'down')}
                                                            className="flex items-center justify-center p-1.5 rounded-lg border text-xs font-semibold transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-600"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 11V4m-7 10h2m-2-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}

                                                {/* Retry — icon only (hidden if any feedback submitted) */}
                                                {!submittedSet.has(msgId) && (
                                                    <button
                                                        title="Retry this question"
                                                        disabled={isLoading}
                                                        onClick={() => {
                                                            const userMsg = getRelatedUserMessage(msgIndex);
                                                            if (userMsg) {
                                                                const plainText = (userMsg.content || '').replace(/<[^>]*>/g, '').trim();
                                                                if (plainText) onSendMessage(plainText);
                                                            }
                                                        }}
                                                        className={`flex items-center justify-center p-1.5 rounded-lg border text-xs font-semibold transition-all
                                                            ${isLoading
                                                                ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400'
                                                            }`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Raise a Ticket / Ticket Raised - Show if not submitted OR if submitted as 'down' */}
                                                {(!submittedSet.has(msgId) || currentThumb === 'down') && (
                                                    ticketRaisedMap[msgId] ? (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span>Ticket raised ({ticketRaisedMap[msgId]})</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            title="Raise a support ticket"
                                                            onClick={() => handleTicketClick(msg, msgIndex)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-600 dark:hover:text-amber-400"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                                            </svg>
                                                            Raise a Ticket
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="flex gap-3 md:gap-6 animate-up">
                                <div className="w-8 h-8 rounded-lg bg-zuari-navy flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <div className="pt-3 thinking-dots text-gray-400">
                                    <span className="bg-current"></span>
                                    <span className="bg-current"></span>
                                    <span className="bg-current"></span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="w-full px-4 md:px-6 pb-6 md:pb-10">
                <div className="max-w-6xl mx-auto relative">
                    {messages.length === 0 && (
                        <div className="mb-4">
                            {isFaqLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-800/60 rounded-xl p-4 flex items-center gap-3 border border-transparent">
                                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 shrink-0"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                displayFaqs.length > 0 && (
                                    <div
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3
                                                   overflow-y-auto custom-scrollbar
                                                   max-h-[calc(4*3.75rem+3*0.75rem)]
                                                   sm:max-h-none sm:overflow-visible"
                                    >
                                        {displayFaqs.map((faq, index) => {
                                            const style = faqStyles[index % faqStyles.length];
                                            return (
                                                <button key={index} onClick={() => handleSuggestion(faq.question)} className="relative flex items-center text-left p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-blue-100 dark:hover:border-slate-700 transition-all group backdrop-blur-sm">
                                                    <div className={`p-2 rounded-lg shrink-0 ${style.bg} group-hover:scale-110 transition-transform`}>
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {style.icon}
                                                        </svg>
                                                    </div>
                                                    <span className="font-semibold text-[13px] text-[var(--text-main)] ml-3 leading-snug">{faq.question}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="relative group flex items-end">
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                const scrollHeight = e.target.scrollHeight;
                                e.target.style.height = Math.max(56, Math.min(scrollHeight, 140)) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="Ask your HR Assistant anything..."
                            className="w-full bg-[var(--input-bg)] backdrop-blur-xl shadow-sm border border-gray-200 dark:border-slate-700 rounded-2xl py-[16px] pl-[24px] pr-[60px] outline-none text-[15px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-[var(--text-main)] resize-none custom-scrollbar leading-[24px]"
                            style={{ height: '56px' }}
                        />
                        <button
                            type="submit"
                            className="absolute right-[8px] bottom-[8px] w-[40px] h-[40px] bg-zuari-navy text-white rounded-[12px] flex items-center justify-center hover:bg-[#122856] transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"></path></svg>
                        </button>
                    </form>
                    <p className="text-[11px] text-gray-500 text-center mt-3 font-semibold opacity-60">
                        AskHR can make mistakes. Check with corporate Hr team for more info.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatArea;
