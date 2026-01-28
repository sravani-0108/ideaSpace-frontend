import { useEffect, useState } from 'react';
import { meetingService } from '../../services/meeting.service';
import { hackathonService } from '../../services/hackathon.service';
import { Meeting, Hackathon } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Calendar from '../../components/Calendar';
import LeftSidebar from '../../components/LeftSidebar';
import RightSidebar from '../../components/RightSidebar';

const MyCalendar = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadCalendarData();
    }
  }, [user]);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Load user meetings
      const userMeetings = await meetingService.getUserMeetings();
      setMeetings(userMeetings);

      // Load all hackathons (Calendar component will handle showing all and registration)
      const allHackathons = await hackathonService.getAllHackathons();
      setHackathons(allHackathons);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
              <p className="mt-1 text-gray-600 text-sm">Hackathon dates and meeting schedules</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={loadCalendarData}
                  className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline"
                >
                  Try again
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading calendar...</p>
              </div>
            ) : (
              <Calendar 
                hackathons={hackathons} 
                meetings={meetings} 
                showAllHackathons={true}
                onHackathonRegistered={loadCalendarData}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};

export default MyCalendar;

