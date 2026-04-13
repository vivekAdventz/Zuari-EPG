import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import EmployeeDashboard from './pages/EmployeeDashboard';
// Note: LoginPage component removed; login is handled via a modal on the HomePage
import HomePage from './pages/HomePage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEntities from './pages/admin/AdminEntities';
import AdminPolicies from './pages/admin/AdminPolicies';
import AdminInteractions from './pages/admin/AdminInteractions';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminConfig from './pages/admin/AdminConfig';
import AdminInsights from './pages/admin/AdminInsights';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminVectorDb from './pages/superadmin/SuperAdminVectorDb';
import SuperAdminFeedbacks from './pages/superadmin/SuperAdminFeedbacks';
import SuperAdminInteractions from './pages/superadmin/SuperAdminInteractions';
import SuperAdminApiCost from './pages/superadmin/SuperAdminApiCost';
import AdminFeedbackAnalysis from './pages/admin/AdminFeedbackAnalysis';
import AdminHrOps from './pages/admin/AdminHrOps';
import HrOpsLayout from './pages/hrops/HrOpsLayout';
import HrOpsOverview from './pages/hrops/HrOpsOverview';
import Playground from './pages/Playground';
import AuthCallback from './pages/AuthCallback';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import AdminLogin from './pages/admin/AdminLogin';

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user) return <Navigate to="/" replace />;
  if (!user.roles?.includes('superAdmin')) return <Navigate to="/" replace />;

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user) return <Navigate to="/" replace />;
  if (!user.roles?.includes('admin') && !user.roles?.includes('superAdmin')) return <Navigate to="/" replace />;

  return children;
};

const EmployeeRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user) return <Navigate to="/" replace />;
  // Allow if user has employee/hrOps role OR both roles (dual-role users can access employee view)
  if (!user.roles?.includes('employee') && !user.roles?.includes('hrOps') && !user.roles?.includes('admin') && !user.roles?.includes('superAdmin')) {
    return <Navigate to="/" replace />;
  }
  // Pure admin (no employee/hrOps role) → redirect to admin dashboard
  if (!user.roles?.includes('employee') && !user.roles?.includes('hrOps')) {
    if (user.roles?.includes('superAdmin')) return <Navigate to="/super-admin/dashboard" replace />;
    if (user.roles?.includes('admin')) return <Navigate to="/admin/dashboard" replace />;
  }
  // Pure hrOps (no employee role) → redirect to hrOps dashboard
  if (!user.roles?.includes('employee') && user.roles?.includes('hrOps')) {
    return <Navigate to="/hrops/dashboard" replace />;
  }

  return children;
};

const HrOpsRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (!user.roles?.includes('hrOps')) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;

  // If already logged in, redirect away from /login
  if (user) {
    if (user.roles?.includes('superAdmin')) return <Navigate to="/super-admin/dashboard" replace />;
    if (user.roles?.includes('employee')) return <Navigate to="/chat" replace />;
    if (user.roles?.includes('admin')) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/chat" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        
        <Route path="/superadmin/login" element={
          <PublicRoute>
            <SuperAdminLogin />
          </PublicRoute>
        } />

        <Route path="/admin/login" element={
          <PublicRoute>
            <AdminLogin />
          </PublicRoute>
        } />

        <Route path="/" element={<HomePage />} />

        {/* Employee Routes */}
        <Route path="/chat" element={
          <EmployeeRoute>
            <EmployeeDashboard />
          </EmployeeRoute>
        } />


        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="entities" element={<AdminEntities />} />
          <Route path="policies" element={<AdminPolicies />} />

          <Route path="interactions" element={<AdminInteractions />} />
          <Route path="user-management" element={<AdminEmployees />} />
          <Route path="config" element={<AdminConfig />} />
          <Route path="playground" element={<Playground />} />
          <Route path="insights" element={<AdminInsights />} />
          <Route path="feedback-analysis" element={<AdminFeedbackAnalysis />} />
          <Route path="hrops-management" element={<AdminHrOps />} />
        </Route>

        {/* HROps Routes */}
        <Route path="/hrops" element={
          <HrOpsRoute>
            <HrOpsLayout />
          </HrOpsRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HrOpsOverview />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="vector-db" element={<SuperAdminVectorDb />} />
          <Route path="playground" element={<Playground />} />
          <Route path="feedbacks" element={<SuperAdminFeedbacks />} />
          <Route path="interactions" element={<SuperAdminInteractions />} />
          <Route path="api-cost" element={<SuperAdminApiCost />} />
        </Route>

        {/* Microsoft SSO callback — must be before the wildcard */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
