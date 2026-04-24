const fs = require('fs');

const overviewPath = 'HrOpsOverview.jsx';
const dashboardPath = 'HrOpsDashboard.jsx';

let overviewStr = fs.readFileSync(overviewPath, 'utf8');
let dashboardStr = fs.readFileSync(dashboardPath, 'utf8');

// The Table is lines between `            {/* Filter tabs */}` and the end before `        </div>`
const tableStart = dashboardStr.indexOf('            {/* Filter tabs */}');
const tableEnd = dashboardStr.lastIndexOf('        </div>');

const tableCode = dashboardStr.substring(tableStart, tableEnd);

// In overview: remove Quick Actions and Recent Tickets
const qaStart = overviewStr.indexOf('            {/* Quick Actions */}');
const rtEnd = overviewStr.lastIndexOf('        </div>\n    );\n};');

// We also need TicketChatModal import
let newOverview = overviewStr.replace(
    `import { getHrOpsStats, getAssignedTickets } from '../../api';`,
    `import { getHrOpsStats, getAssignedTickets } from '../../api';\nimport TicketChatModal from '../../components/TicketChatModal';\nimport { FiMessageCircle } from 'react-icons/fi';`
);

// We need to add state for tickets filters
newOverview = newOverview.replace(
    `const [loading, setLoading] = useState(true);`,
    `const [loading, setLoading] = useState(true);\n    const [statusFilter, setStatusFilter] = useState('');\n    const [selectedTicket, setSelectedTicket] = useState(null);`
);

// We need to update fetchData
newOverview = newOverview.replace(
    `getAssignedTickets({})`,
    `getAssignedTickets(statusFilter ? { status: statusFilter } : {})`
);

// we need to set all tickets to TICKETS not just top 5
newOverview = newOverview.replace(
    `const all = ticketsRes.data || [];\n                setRecentTickets(all.slice(0, 5));`,
    `setTickets(ticketsRes.data || []);`
);

// Remove recent tickets state entirely
newOverview = newOverview.replace(
    `const [recentTickets, setRecentTickets] = useState([]);`,
    `const [tickets, setTickets] = useState([]);`
);

// replace the useEffect hook for refetching on filter change
newOverview = newOverview.replace(
    `useEffect(() => {\n        const fetchData = async () => {\n            setLoading(true);\n            try {\n                const [statsRes, ticketsRes] = await Promise.all([\n                    getHrOpsStats(),\n                    getAssignedTickets(statusFilter ? { status: statusFilter } : {}),\n                ]);\n                setStats(statsRes);\n                setTickets(ticketsRes.data || []);\n            } catch (e) {\n                toast.error(e.message || 'Failed to load dashboard');\n            } finally {\n                setLoading(false);\n            }\n        };\n        fetchData();\n    }, []);`,
    `const fetchData = async () => {\n        setLoading(true);\n        try {\n            const [statsRes, ticketsRes] = await Promise.all([\n                getHrOpsStats(),\n                getAssignedTickets(statusFilter ? { status: statusFilter } : {}),\n            ]);\n            setStats(statsRes);\n            setTickets(ticketsRes.data || []);\n        } catch (e) {\n            toast.error(e.message || 'Failed to load dashboard');\n        } finally {\n            setLoading(false);\n        }\n    };\n\n    useEffect(() => { fetchData(); }, [statusFilter]);`
);

// Replace Open Ticket Console button in header
newOverview = newOverview.replace(
    /<button[^>]*onClick=\{\(\) => navigate\('\/hrops\/tickets'\)\}[^>]*>[\s\S]*?<\/button>/,
    `<button onClick={fetchData} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-sm font-bold shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95">\n                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>\n                    Refresh\n                </button>`
);

// Inject TicketChatModal outside animate-up div
newOverview = newOverview.replace(
    `<div className="space-y-7 animate-up">`,
    `{selectedTicket && (\n                <TicketChatModal\n                    ticket={selectedTicket}\n                    onClose={() => { setSelectedTicket(null); fetchData(); }}\n                    userRole="hrOps"\n                />\n            )}\n\n        <div className="space-y-7 animate-up">`
);


// replace the Quick Actions and Recent Tickets with the Table
newOverview = newOverview.substring(0, newOverview.indexOf('            {/* Quick Actions */}')) + tableCode + '\n        </div>\n    );\n};\n\nexport default HrOpsOverview;';

fs.writeFileSync('HrOpsOverview.jsx', newOverview);
