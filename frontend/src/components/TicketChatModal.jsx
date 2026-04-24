import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSend, FiPaperclip, FiFileText, FiImage, FiFile, FiDownload, FiMaximize2, FiEye, FiCalendar, FiTag, FiHash, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getEmployeeTicketMessages, sendEmployeeTicketMessage, getHrOpsTicketMessages, sendHrOpsTicketMessage, updateAssignedTicket, getAuthHeaders } from '../api';

const API_URL = import.meta.env.VITE_BACKEND_URL || "";

const authenticatedDownload = async (url, filename) => {
    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // Not strictly necessary for GET, but good practice
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('File fetch failed');
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
    } catch (err) {
        console.error(err);
        alert('Failed to download file securely');
    }
};

const SecureImage = ({ url, alt, onPreview }) => {
    const [imgUrl, setImgUrl] = useState(null);
    useEffect(() => {
        let objectUrl = null;
        const fetchImg = async () => {
            try {
                const headers = getAuthHeaders();
                delete headers['Content-Type'];
                const res = await fetch(url, { headers });
                if (!res.ok) return;
                const blob = await res.blob();
                objectUrl = URL.createObjectURL(blob);
                setImgUrl(objectUrl);
            } catch(e) {
                console.error('Failed to load image', e);
            }
        };
        fetchImg();
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
    }, [url]);

    if (!imgUrl) return <div className="h-24 w-24 flex items-center justify-center bg-gray-100 rounded-lg animate-pulse my-1"><FiImage size={24} className="text-gray-400"/></div>;
    return (
        <div className="relative group cursor-pointer" onClick={() => onPreview(imgUrl)}>
            <img src={imgUrl} alt={alt} className="max-h-48 rounded-lg outline outline-1 outline-black/10 object-contain my-1 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                <div className="bg-white/90 p-2 rounded-full shadow-lg text-indigo-600">
                    <FiMaximize2 size={16} />
                </div>
            </div>
        </div>
    );
};

const FilePreviewModal = ({ file, onClose }) => {
    const isImage = file.type === 'image';
    const isPdf = file.name?.toLowerCase().endsWith('.pdf');

    const [blobUrl, setBlobUrl] = useState(isImage ? file.url : null);
    const [loading, setLoading] = useState(!isImage);
    const [error, setError] = useState(null);

    useEffect(() => {
        let currentBlobUrl = null;
        
        if (isImage) {
            setBlobUrl(file.url);
            setLoading(false);
            return;
        }

        const fetchFile = async () => {
            setLoading(true);
            try {
                const headers = getAuthHeaders();
                delete headers['Content-Type'];
                const res = await fetch(file.originalUrl, { headers });
                if (!res.ok) throw new Error('Failed to load file');
                const blob = await res.blob();
                currentBlobUrl = URL.createObjectURL(blob);
                setBlobUrl(currentBlobUrl);
            } catch (err) {
                console.error(err);
                setError('Could not load preview. Please use the download button.');
            } finally {
                setLoading(false);
            }
        };

        fetchFile();

        return () => {
            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        };
    }, [file.originalUrl, isImage]);

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            {isImage ? <FiImage size={20}/> : <FiFileText size={20}/>}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={file.name}>
                            {file.name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                authenticatedDownload(file.originalUrl, file.name);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                        >
                            <FiDownload size={14}/>
                            Download
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 transition-colors"
                        >
                            <FiX size={20}/>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-black/20 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px]">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                            <p className="text-sm font-medium text-gray-500">Preparing preview...</p>
                        </div>
                    ) : error ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8">
                             <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                                <FiX size={32}/>
                             </div>
                             <p className="text-gray-900 dark:text-white font-bold">{error}</p>
                             <button 
                                onClick={() => authenticatedDownload(file.originalUrl, file.name)}
                                className="mt-4 px-6 py-2 bg-gray-800 dark:bg-white dark:text-gray-900 text-white rounded-xl font-bold text-sm"
                             >
                                 Download instead
                             </button>
                        </div>
                    ) : isImage ? (
                        <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
                            <img 
                                src={blobUrl} 
                                alt={file.name} 
                                className="max-w-full max-h-full object-contain shadow-lg rounded-lg" 
                            />
                        </div>
                    ) : isPdf ? (
                        <iframe 
                            src={`${blobUrl}#toolbar=0`} 
                            className="w-full h-full border-none"
                            title={file.name}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-gray-400 mb-4">
                                <FiFile size={48}/>
                            </div>
                            <p className="text-gray-900 dark:text-white font-bold">{file.name}</p>
                            <p className="text-sm text-gray-400 mb-6">No preview available for this file type.</p>
                            <button 
                                onClick={() => authenticatedDownload(file.originalUrl, file.name)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
                             >
                                 Download File
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TicketChatModal = ({ ticket, onClose, userRole }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // HROps ticket detail state
    const [ticketStatus, setTicketStatus] = useState(ticket.status);
    const [saving, setSaving] = useState(false);

    const isEmployee = userRole === 'employee';
    const isHrOps = userRole === 'hrOps';

    const fetchMessages = async () => {
        try {
            let data;
            if (isEmployee) {
                data = await getEmployeeTicketMessages(ticket._id);
            } else {
                data = await getHrOpsTicketMessages(ticket._id);
            }
            setMessages(data);
        } catch (error) {
            console.error("Failed to fetch ticket messages", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        // Polling every 10 seconds for new messages
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line
    }, [ticket._id, isEmployee]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const lastHrRequest = [...messages].reverse().find(m => m.senderRole === 'hrOps' && m.requestUpload);
    const lastEmployeeMsgAfterUploadRequest = lastHrRequest 
        ? messages.slice(messages.lastIndexOf(lastHrRequest) + 1).find(m => m.senderRole === 'employee')
        : null;
    const isUploadPending = isEmployee && lastHrRequest && !lastEmployeeMsgAfterUploadRequest;

    // Employee can only chat after HROps has replied at least once
    const hrOpsHasReplied = messages.some(m => m.senderRole === 'hrOps');
    const employeeChatDisabled = isEmployee && !hrOpsHasReplied;

    const handleSendUploadRequest = async (type) => {
        if (sending) return;
        setSending(true);
        try {
            const msg = await sendHrOpsTicketMessage(ticket._id, '', null, type);
            setMessages(prev => [...prev, msg]);
        } catch (error) {
            console.error(error);
            alert("Failed to send upload request.");
        } finally {
            setSending(false);
        }
    };

    const handleSend = async (e) => {
        if(e) e.preventDefault();
        if ((!newMessage.trim() && !attachment) || sending) return;

        setSending(true);
        try {
            let newlySentMessage;
            if (isEmployee) {
                newlySentMessage = await sendEmployeeTicketMessage(ticket._id, newMessage, attachment);
            } else {
                newlySentMessage = await sendHrOpsTicketMessage(ticket._id, newMessage, attachment);
            }
            
            // Append newly sent message locally right away
            setMessages(prev => [...prev, newlySentMessage]);
            setNewMessage('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = null;
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit.');
            return;
        }
        setAttachment(file);
    };

    const handleSaveTicket = async () => {
        setSaving(true);
        try {
            await updateAssignedTicket(ticket._id, { status: ticketStatus });
            toast.success('Ticket status updated');
        } catch (e) {
            toast.error(e.message || 'Failed to update ticket');
        } finally {
            setSaving(false);
        }
    };

    const getFullImageUrl = (url) => {
        if (!url) return '';
        
        // Convert legacy direct upload paths to secure API paths
        let secureUrl = url;
        if (url.startsWith('/uploads/chat/')) {
            secureUrl = url.replace('/uploads/chat/', '/api/chat/files/');
        }

        if (secureUrl.startsWith('http')) return secureUrl;
        return `${API_URL}${secureUrl}`;
    };

    const STATUS_META = {
        open:     { label: 'Open',     cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
        hold:     { label: 'Hold',     cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
        resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    };

    // ─── Ticket Detail Panel (Left side) ────────────────────────
    const TicketDetailPanel = () => (
        <div className="w-[380px] shrink-0 border-r border-gray-100 flex flex-col h-full bg-white overflow-hidden">
            {/* Ticket Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm font-black text-indigo-600">{ticket.ticketNumber}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_META[ticketStatus]?.cls || STATUS_META.open.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[ticketStatus]?.dot || STATUS_META.open.dot}`} />
                        {STATUS_META[ticketStatus]?.label || 'Open'}
                    </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm leading-snug">
                    {ticket.subject || ticket.userQuestion || 'No subject'}
                </h3>
            </div>

            {/* Scrollable Details */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Employee Info (HROps only) */}
                {isHrOps && (
                <div className="px-5 py-4 border-b border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Employee Details</p>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                            {ticket.userName?.charAt(0) || '?'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{ticket.userName}</p>
                            <p className="text-xs text-gray-400">{ticket.userEmail}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {ticket.userEntity && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <FiTag size={12} className="text-gray-400 shrink-0" />
                                <span className="font-medium">Entity:</span>
                                <span className="text-gray-700 font-semibold">{ticket.userEntity}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiHash size={12} className="text-gray-400 shrink-0" />
                            <span className="font-medium">Theme:</span>
                            <span className="text-gray-700 font-semibold">{ticket.themeName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiCalendar size={12} className="text-gray-400 shrink-0" />
                            <span className="font-medium">Created:</span>
                            <span className="text-gray-700 font-semibold">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
                )}

                {/* Ticket Info (Employee view) */}
                {isEmployee && (
                <div className="px-5 py-4 border-b border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Ticket Info</p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiHash size={12} className="text-gray-400 shrink-0" />
                            <span className="font-medium">Theme:</span>
                            <span className="text-gray-700 font-semibold">{ticket.themeName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiCalendar size={12} className="text-gray-400 shrink-0" />
                            <span className="font-medium">Created:</span>
                            <span className="text-gray-700 font-semibold">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
                )}

                {/* Question */}
                {ticket.userQuestion && (
                    <div className="px-5 py-4 border-b border-gray-50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isEmployee ? 'Your Question' : 'Employee Question'}</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3.5 py-2.5 leading-relaxed">{ticket.userQuestion}</p>
                    </div>
                )}

                {/* AI Response */}
                {ticket.aiResponse && (
                    <div className="px-5 py-4 border-b border-gray-50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Response</p>
                        <p className="text-sm text-gray-600 bg-blue-50/50 rounded-xl px-3.5 py-2.5 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">{ticket.aiResponse}</p>
                    </div>
                )}

                {/* Description */}
                {ticket.description && (
                    <div className="px-5 py-4 border-b border-gray-50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                    </div>
                )}

                {/* Status Update (HROps only) */}
                {isHrOps && (
                    <div className="px-5 py-4 space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update Status</p>
                        <div>
                            <select
                                value={ticketStatus}
                                onChange={e => setTicketStatus(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 outline-none focus:ring-2 focus:ring-indigo-400/30 text-gray-800 transition-all"
                            >
                                <option value="open">Open</option>
                                <option value="hold">Hold</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                        <button
                            onClick={handleSaveTicket}
                            disabled={saving || ticketStatus === ticket.status}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <FiCheckCircle size={14} />
                            {saving ? 'Saving...' : 'Update Status'}
                        </button>
                    </div>
                )}

                {/* Status display (Employee only) */}
                {isEmployee && (
                    <div className="px-5 py-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</p>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_META[ticketStatus]?.cls || STATUS_META.open.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[ticketStatus]?.dot || STATUS_META.open.dot}`} />
                            {STATUS_META[ticketStatus]?.label || 'Open'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl flex flex-col h-[85vh] w-full max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Ticket Chat: {ticket.ticketNumber}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{ticket.subject || ticket.themeName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Body: side-by-side layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Ticket details */}
                    <TicketDetailPanel />

                    {/* Right: Chat area */}
                    <div className="flex-1 flex flex-col min-w-0">

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 my-10">
                            No messages yet. Start the conversation!
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMine = msg.senderRole === userRole;
                            return (
                                <div key={msg._id || idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                    <span className="text-xs text-gray-400 mb-1 px-1">
                                        {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div 
                                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                            isMine ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                        }`}
                                    >
                                        {msg.message && (
                                            <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>
                                        )}
                                        {msg.attachmentUrl && (
                                            <div className="mt-2 text-sm">
                                                {msg.attachmentType === 'image' ? (
                                                    <SecureImage 
                                                        url={getFullImageUrl(msg.attachmentUrl)} 
                                                        alt={msg.attachmentName} 
                                                        onPreview={(blobUrl) => setPreviewFile({
                                                            url: blobUrl,
                                                            originalUrl: getFullImageUrl(msg.attachmentUrl),
                                                            name: msg.attachmentName,
                                                            type: 'image'
                                                        })}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <button 
                                                            onClick={() => setPreviewFile({
                                                                url: null,
                                                                originalUrl: getFullImageUrl(msg.attachmentUrl),
                                                                name: msg.attachmentName,
                                                                type: 'file'
                                                            })}
                                                            className={`flex items-center gap-2 p-2.5 rounded-xl w-full text-left border ${
                                                                isMine 
                                                                ? 'bg-indigo-700/50 hover:bg-indigo-700 border-indigo-500/30' 
                                                                : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-gray-100 dark:border-slate-700'
                                                            } transition-all group`}
                                                        >
                                                            <div className={`p-2 rounded-lg ${isMine ? 'bg-indigo-600' : 'bg-white dark:bg-slate-900'} shadow-sm`}>
                                                                <FiFileText size={18} />
                                                            </div>
                                                            <div className="flex-1 truncate">
                                                                <p className="truncate font-bold text-xs">{msg.attachmentName || 'Document.pdf'}</p>
                                                                <p className={`text-[10px] ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>Click to preview</p>
                                                            </div>
                                                            <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <FiEye size={14} />
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
                    {/* Employee waiting for HROps first reply */}
                    {employeeChatDisabled && !isUploadPending ? (
                        <div className="flex items-center justify-center py-4 px-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                <p className="text-sm font-medium text-amber-700">Waiting for HROps to respond. You'll be able to reply once they do.</p>
                            </div>
                        </div>
                    ) : isUploadPending ? (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-6 bg-indigo-50/50">
                            <p className="text-sm font-bold text-indigo-700 mb-4">{lastHrRequest.message || "Please upload required file for further conversations."}</p>
                            
                            {!attachment ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    <FiPaperclip size={18} />
                                    <span>Select File ({lastHrRequest.requestUploadType === 'image' ? 'Image' : 'PDF'})</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 bg-white text-indigo-700 rounded-lg text-sm border border-indigo-100 shadow-sm w-full max-w-sm">
                                    <FiFileText size={20} className="flex-shrink-0" />
                                    <span className="truncate flex-1 font-medium">{attachment.name}</span>
                                    <button 
                                        onClick={() => { setAttachment(null); fileInputRef.current.value = null; }}
                                        className="p-1 hover:bg-indigo-50 rounded-md transition-colors text-gray-400 hover:text-red-500"
                                    >
                                        <FiX size={18} />
                                    </button>
                                    <button 
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="ml-1 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={16} />}
                                    </button>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept={lastHrRequest.requestUploadType === 'image' ? 'image/jpeg,image/png' : 'application/pdf'}
                            />
                        </div>
                    ) : (
                        /* Standard Chat Input */
                        <>
                            {attachment && !isEmployee && (
                                <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm border border-indigo-100">
                                    <FiFileText size={18} className="flex-shrink-0" />
                                    <span className="truncate flex-1">{attachment.name}</span>
                                    <button 
                                        onClick={() => { setAttachment(null); fileInputRef.current.value = null; }}
                                        className="p-1 hover:bg-indigo-100 rounded-md transition-colors"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSend} className="flex gap-2 items-center">
                                {!isEmployee && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0"
                                            title="Attach File"
                                            disabled={ticket.status === 'resolved'}
                                        >
                                            <FiPaperclip size={20} />
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            className="hidden" 
                                            accept="image/jpeg,image/png,application/pdf"
                                        />
                                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => handleSendUploadRequest('image')}
                                            className="p-2.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shrink-0"
                                            title="Request Image Upload"
                                            disabled={ticket.status === 'resolved' || sending}
                                        >
                                            <FiImage size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSendUploadRequest('pdf')}
                                            className="p-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                                            title="Request PDF Upload"
                                            disabled={ticket.status === 'resolved' || sending}
                                        >
                                            <FiFile size={18} />
                                        </button>
                                    </>
                                )}
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all text-sm outline-none"
                                    disabled={ticket.status === 'resolved'}
                                />
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !attachment) || sending || ticket.status === 'resolved'}
                                    className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                                >
                                    {sending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <FiSend size={20} />
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                    {ticket.status === 'resolved' && (
                        <p className="text-xs text-center text-red-500 mt-2">
                            This ticket is resolved. You cannot send new messages.
                        </p>
                    )}
                </div>
                    </div>{/* end chat column */}
                </div>{/* end flex row */}

                {/* Preview Modal */}
                {previewFile && (
                    <FilePreviewModal 
                        file={previewFile} 
                        onClose={() => setPreviewFile(null)} 
                    />
                )}
            </div>
        </div>
    );
};

export default TicketChatModal;
