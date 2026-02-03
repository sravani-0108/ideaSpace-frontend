import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../utils/user.util';
import { hackathonService } from '../services/hackathon.service';
import { HackathonType } from '../types';

const LeftSidebar = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [hasAssignedHackathons, setHasAssignedHackathons] = useState(false);

  useEffect(() => {
    checkAssignedHackathons();
  }, [user]);

  const checkAssignedHackathons = async () => {
    if (!user || isAdmin) {
      setHasAssignedHackathons(false);
      return;
    }

    try {
      const allHackathons = await hackathonService.getAllHackathons();
      const assigned = allHackathons.some(hackathon => 
        hackathon.hackathonType === HackathonType.HANDS_ON &&
        hackathon.judgeIds &&
        hackathon.judgeIds.includes(user.id)
      );
      setHasAssignedHackathons(assigned);
    } catch (err) {
      setHasAssignedHackathons(false);
    }
  };

  if (!user) return null;

  const userInitials = getUserInitials(user);
  const userName = getUserDisplayName(user);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-20">
        {/* Profile Card */}
        <div className="text-center pb-4 border-b border-gray-200 mb-4">
          {(() => {
            const profilePicUrl = getProfilePictureUrl(user);
            return profilePicUrl ? (
              <img
                key={`sidebar-${user.id}-${user.profilePicture || 'no-pic'}`}
                src={profilePicUrl}
                alt={userName}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 shadow-md"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-md';
                  fallback.textContent = userInitials;
                  target.parentNode?.appendChild(fallback);
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-md">
                {userInitials}
              </div>
            );
          })()}
          <h3 className="font-semibold text-gray-900 text-lg">{userName}</h3>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          <span className="inline-block mt-2 px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
            {user.role}
          </span>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/dashboard') || isActive('/')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Ideas Feed</span>
          </Link>

          <Link
            to="/my-ideas"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/my-ideas')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>My Ideas</span>
          </Link>

          <Link
            to="/saved"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/saved')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>Saved Items</span>
          </Link>

          <Link
            to="/my-projects"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/my-projects')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>My Solutions</span>
          </Link>

          <Link
            to="/my-teams"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/my-teams')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>My Teams</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin/review"
              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/admin/review')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Admin Review</span>
            </Link>
          )}

          {/* Review button for assigned users (judges) */}
          {hasAssignedHackathons && (
            <Link
              to="/review"
              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/review')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Review</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;

