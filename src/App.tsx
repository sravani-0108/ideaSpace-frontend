import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import TopNavbar from './components/TopNavbar';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IdeaDetails from './pages/IdeaDetails';
import MyIdeas from './pages/MyIdeas';
import AdminReview from './pages/AdminReview';
import SavedItems from './pages/SavedItems';
import AdminDashboard from './pages/admin/AdminDashboard';
import CompletedTasks from './pages/admin/CompletedTasks';
import AdminIdeas from './pages/admin/AdminIdeas';
import AdminCreateIdea from './pages/admin/CreateIdea';
import Hackathons from './pages/admin/Hackathons';
import AdminHackathonDetails from './pages/admin/HackathonDetails';
import CreateHackathon from './pages/admin/CreateHackathon';
import UserDashboard from './pages/user/UserDashboard';
import UserHackathonDetails from './pages/user/HackathonDetails';
import SubmitIdeaForHackathon from './pages/user/SubmitIdeaForHackathon';
import HandsOnHackathonIdeas from './pages/user/HandsOnHackathonIdeas';
import ProjectSubmission from './pages/user/ProjectSubmission';
import MyProjects from './pages/user/MyProjects';
import MyTeams from './pages/user/MyTeams';
import JudgeDashboard from './pages/judge/JudgeDashboard';
import IdeaReview from './pages/judge/IdeaReview';
import ProjectReview from './pages/judge/ProjectReview';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth state to load before making routing decisions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ideas/:id"
        element={<IdeaDetails />}
      />
      <Route
        path="/hackathons/:id"
        element={
          <ProtectedRoute>
            <UserHackathonDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/:hackathonId/submit-idea"
        element={
          <ProtectedRoute>
            <SubmitIdeaForHackathon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/:hackathonId/ideas"
        element={
          <ProtectedRoute>
            <HandsOnHackathonIdeas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ideas/:ideaId/submit-project"
        element={
          <ProtectedRoute>
            <ProjectSubmission />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-ideas"
        element={
          <ProtectedRoute>
            <MyIdeas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <SavedItems />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-projects"
        element={
          <ProtectedRoute>
            <MyProjects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-teams"
        element={
          <ProtectedRoute>
            <MyTeams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:userId"
        element={<UserProfile />}
      />
      <Route
        path="/admin/review"
        element={
          <ProtectedRoute requireAdmin>
            <AdminReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/completed-tasks"
        element={
          <ProtectedRoute requireAdmin>
            <CompletedTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ideas"
        element={
          <ProtectedRoute requireAdmin>
            <AdminIdeas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/create-idea"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCreateIdea />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hackathons"
        element={
          <ProtectedRoute requireAdmin>
            <Hackathons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hackathons/create"
        element={
          <ProtectedRoute requireAdmin>
            <CreateHackathon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hackathons/:id"
        element={
          <ProtectedRoute requireAdmin>
            <AdminHackathonDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge/dashboard"
        element={
          <ProtectedRoute>
            <JudgeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge/ideas/:ideaId/review"
        element={
          <ProtectedRoute>
            <IdeaReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge/projects/:projectId/review"
        element={
          <ProtectedRoute>
            <ProjectReview />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <TopNavbar />
            <AppRoutes />
          </div>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

