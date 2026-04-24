import React, { useState } from 'react';

const FeedbackModal = ({ isOpen, onClose, onSubmit, metadata }) => {
    const [selectedChips, setSelectedChips] = useState([]);
    const [details, setDetails] = useState('');

    const chips = [
        "Incorrect or incomplete",
        "Not what I asked for",
        "Slow or buggy",
        "Style or tone",
        "Other"
    ];

    const toggleChip = (chip) => {
        setSelectedChips(prev => 
            prev.includes(chip) 
            ? prev.filter(c => c !== chip) 
            : [...prev, chip]
        );
    };

    const handleSubmit = () => {
        onSubmit({ 
            selectedChips, 
            details,
            ...metadata 
        });
        onClose();
        // Reset state
        setSelectedChips([]);
        setDetails('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[24px] shadow-2xl p-6 relative animate-modalScale text-white">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-6">
                    Share feedback
                </h2>

                {/* Chips */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                    {chips.map(chip => (
                        <button
                            key={chip}
                            onClick={() => toggleChip(chip)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                                selectedChips.includes(chip)
                                ? 'bg-white text-slate-900 border-white shadow-lg shadow-white/10'
                                : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                            }`}
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {/* Textarea */}
                <div className="mb-6">
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Share details (optional)"
                        className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-500 resize-none"
                    />
                </div>

                {/* Footer Info */}
                <div className="bg-slate-800/30 rounded-xl p-3 mb-6 border border-slate-800/50 text-[11px] text-slate-400 leading-relaxed">
                    Your conversation will be included with your feedback to help improve the system. <a href="#" className="text-blue-400 hover:underline">Learn more</a>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={selectedChips.length === 0 && !details.trim()}
                        className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all ${
                            selectedChips.length === 0 && !details.trim()
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-white text-slate-900 hover:scale-105 active:scale-95 shadow-lg shadow-white/5'
                        }`}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
