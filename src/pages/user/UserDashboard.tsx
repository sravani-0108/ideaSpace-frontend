import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LeftSidebar from '../../components/LeftSidebar';
import RightSidebar from '../../components/RightSidebar';
import IdeasFeed from './IdeasFeed';
import HackathonsView from './HackathonsView';
import MyCalendar from './MyCalendar';
import MyTeams from './MyTeams';
import UserNotifications from './UserNotifications';

type UserView = 'ideas' | 'hackathons' | 'calendar' | 'teams' | 'notifications';

const UserDashboard = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<UserView>('ideas');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - User Profile & Navigation */}
          <LeftSidebar />

          {/* Main Content */}
          <div className="flex-1">
            {activeView === 'ideas' && <IdeasFeed />}
            {activeView === 'hackathons' && <HackathonsView />}
            {activeView === 'calendar' && <MyCalendar />}
            {activeView === 'teams' && <MyTeams />}
            {activeView === 'notifications' && <UserNotifications />}
          </div>

          {/* Right Sidebar - Hackathon Details & Calendar */}
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

