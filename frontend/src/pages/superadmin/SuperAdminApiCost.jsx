import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
    FiDollarSign, FiCpu, FiActivity, FiFilter, FiCalendar, 
    FiArrowUpRight, FiArrowDownRight, FiBarChart2 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || "";

const SuperAdminApiCost = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [dateRange, setDateRange] = useState('30'); // '7', '30', '90', 'all', 'custom'
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const fetchStats = async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/api/super-admin/api-cost`;
            const params = new URLSearchParams();
            
            if (dateRange !== 'all') {
                let start = new Date();
                if (dateRange === '7') start.setDate(start.getDate() - 7);
                else if (dateRange === '30') start.setDate(start.getDate() - 30);
                else if (dateRange === '90') start.setDate(start.getDate() - 90);
                else if (dateRange === 'custom' && customRange.start) {
                    start = new Date(customRange.start);
                }
                
                if (dateRange !== 'custom' || customRange.start) {
                    params.append('startDate', start.toISOString());
                }
                
                if (dateRange === 'custom' && customRange.end) {
                    params.append('endDate', new Date(customRange.end).toISOString());
                }
            }

            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const response = await fetch(`${url}?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${userInfo.token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            } else {
                toast.error(data.message || 'Failed to fetch API stats');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [dateRange, customRange.start, customRange.end]);

    const COLORS = ['#6366f1', '#e11d48', '#f59e0b', '#10b981', '#8b5cf6'];

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('en-US').format(val);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const { summary, byModel, byOperation, daily } = stats || {};

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Usage & Cost Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track and monitor your Gemini LLM expenditures.</p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    {['7', '30', '90', 'all', 'custom'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                dateRange === range 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            {range === 'all' ? 'All Time' : range === 'custom' ? 'Custom' : `Last ${range}D`}
                        </button>
                    ))}
                </div>
            </div>

            {dateRange === 'custom' && (
                <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
                        <input 
                            type="date" 
                            className="block w-full bg-gray-50 dark:bg-slate-900 border-0 rounded-lg text-sm"
                            value={customRange.start}
                            onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
                        <input 
                            type="date" 
                            className="block w-full bg-gray-50 dark:bg-slate-900 border-0 rounded-lg text-sm"
                            value={customRange.end}
                            onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                </div>
            )}

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Estimated Cost</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(summary.totalCost)}</h3>
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                            <FiActivity size={12}/>
                            <span>USD</span>
                        </div>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <FiDollarSign size={20}/>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Tokens Consumed</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatNumber(summary.totalTokens)}</h3>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Across all models & operations</p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                        <FiCpu size={20}/>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Input Tokens</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatNumber(summary.totalPromptTokens)}</h3>
                        <div className="flex items-center gap-1 text-blue-500 text-xs font-bold mt-2 font-bold uppercase tracking-tighter">
                            <span>{((summary.totalPromptTokens / summary.totalTokens) * 100).toFixed(1)}% of total</span>
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <FiArrowDownRight size={20}/>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Output Tokens</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{formatNumber(summary.totalCompletionTokens)}</h3>
                        <div className="flex items-center gap-1 text-purple-500 text-xs font-bold mt-2 font-bold uppercase tracking-tighter">
                             <span>{((summary.totalCompletionTokens / summary.totalTokens) * 100).toFixed(1)}% of total</span>
                        </div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                        <FiArrowUpRight size={20}/>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cost Over Time */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Daily Spending Curve</h4>
                            <p className="text-xs text-gray-400">Total USD cost per day aggregated.</p>
                        </div>
                        <FiBarChart2 className="text-indigo-600 dark:text-indigo-400" size={20} />
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={daily}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="_id" 
                                    tick={{fontSize: 10}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                                />
                                <YAxis 
                                    tick={{fontSize: 10}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    tickFormatter={(val) => `$${val.toFixed(2)}`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Distribution */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Model Distribution</h4>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={byModel}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="cost"
                                    nameKey="_id"
                                >
                                    {byModel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                        {byModel.map((m, i) => (
                            <div key={m._id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{m._id}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(m.cost)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Operational Breakdown */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Cost by Operation Type</h4>
                        <p className="text-xs text-gray-400">Comparing financial impact of different AI tasks.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-700">
                                <th className="pb-3 text-xs font-bold text-gray-400 uppercase">Operation</th>
                                <th className="pb-3 text-xs font-bold text-gray-400 uppercase">Count</th>
                                <th className="pb-3 text-xs font-bold text-gray-400 uppercase">Total Tokens</th>
                                <th className="pb-3 text-xs font-bold text-gray-400 uppercase text-right">Associated Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {byOperation.map((op) => (
                                <tr key={op._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="py-4 font-bold text-gray-700 dark:text-gray-300 capitalize">{op._id.replace(/_/g, ' ')}</td>
                                    <td className="py-4 text-sm text-gray-500">{formatNumber(op.count)}</td>
                                    <td className="py-4 text-sm text-gray-500 italic">{formatNumber(op.tokens)}</td>
                                    <td className="py-4 text-right text-indigo-600 font-black">{formatCurrency(op.cost)}</td>
                                </tr>
                            ))}
                            {byOperation.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="py-10 text-center text-gray-400 italic">No operational data available for this range.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminApiCost;
