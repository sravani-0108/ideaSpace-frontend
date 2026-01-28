import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserDashboard from './user/UserDashboard';

const Dashboard = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  // Redirect admin to admin dashboard
  if (isAdmin && isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Show user dashboard for regular users
  if (isAuthenticated) {
    return <UserDashboard />;
  }

  // Public view - redirect to login
  return <Navigate to="/login" replace />;
};

export default Dashboard;
