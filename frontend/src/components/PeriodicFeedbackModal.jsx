import React, { useState } from 'react';

const PeriodicFeedbackModal = ({ isOpen, onClose, onSubmitFeedback }) => {
    const [rating, setRating] = useState(0);
    const [improvementAreas, setImprovementAreas] = useState([]);
    const [successAreas, setSuccessAreas] = useState([]);
    const [suggestions, setSuggestions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const toggleImprovement = (area) => {
        setImprovementAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
    };

    const toggleSuccess = (area) => {
        setSuccessAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
    };

    const handleSubmit = async () => {
        if (rating === 0) return; // Basic validation
        setIsSubmitting(true);
        if (onSubmitFeedback) {
            await onSubmitFeedback({ rating, improvementAreas, successAreas, suggestions });
        } else {
            // Simulate submission delay
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-[520px] max-h-[90%] rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] p-10 relative flex flex-col animate-modalScale">
                {/* Close / Cancel button */}
                <button
                    onClick={onClose}
                    title="Close"
                    className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] bg-blue-600 text-white px-2 py-1 rounded font-black uppercase tracking-widest">Quality Assurance</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Help us train the AI.</h2>
                    <p className="text-slate-500 text-[13px] mt-1">Our training model uses your ratings to improve accuracy.</p>
                </div>

                <div className="flex-1 overflow-y-auto pr-3 -mr-3 custom-scrollbar space-y-8 py-2">
                    {/* Experience Rating */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Overall Experience</label>
                        <div className="flex justify-between px-6">
                            {[1, 2, 3, 4, 5].map((val) => (
                                <button key={val} onClick={() => setRating(val)} className={`text-4xl transition-all duration-200 cursor-pointer ${val === rating ? 'grayscale-0 scale-125' : 'grayscale opacity-30'} hover:grayscale-0 hover:opacity-100`}>
                                    {val === 1 ? '😡' : val === 2 ? '😕' : val === 3 ? '😐' : val === 4 ? '😊' : '😍'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Improvement Areas */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">What can we improve?</label>
                        <div className="flex flex-wrap gap-2">
                            {['Fact Accuracy', 'Response Speed', 'Policy Clarity', 'Tone/Voice', 'Source Citations', 'Ease of Use'].map(area => (
                                <span
                                    key={area}
                                    onClick={() => toggleImprovement(area)}
                                    className={`px-3.5 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all duration-200 select-none border ${improvementAreas.includes(area) ? 'bg-blue-600 text-white border-blue-600 -translate-y-[1px] shadow-[0_4px_12px_rgba(37,99,235,0.2)]' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                                >
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Success Areas */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">What are we doing well?</label>
                        <div className="flex flex-wrap gap-2">
                            {['Quick Summaries', 'Conversation Context', 'Proactive Help', 'Search Interface'].map(area => (
                                <span
                                    key={area}
                                    onClick={() => toggleSuccess(area)}
                                    className={`px-3.5 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all duration-200 select-none border ${successAreas.includes(area) ? 'bg-blue-600 text-white border-blue-600 -translate-y-[1px] shadow-[0_4px_12px_rgba(37,99,235,0.2)]' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                                >
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Open Suggestions */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Any specific suggestions?</label>
                        <textarea
                            value={suggestions}
                            onChange={(e) => setSuggestions(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none transition-all placeholder:text-slate-400"
                            placeholder="I wish the bot could..."
                        ></textarea>
                    </div>
                </div>

                <div className="mt-8 shrink-0 flex flex-col gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className={`w-full bg-slate-900 text-white py-4 rounded-2xl font-bold transition shadow-xl shadow-slate-100 ${rating === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        {isSubmitting ? 'Syncing with Training Model...' : 'Submit Rating'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PeriodicFeedbackModal;
