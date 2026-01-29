import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { meetingService } from '../../services/meeting.service';
import { Hackathon, HackathonStatus, Meeting } from '../../types';
import AdminSidebar from '../../components/AdminSidebar';
import Calendar from '../../components/Calendar';

const HackathonDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  useEffect(() => {
    if (id) {
      loadHackathon();
    }
  }, [id]);

  const loadHackathon = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await hackathonService.getHackathonById(id!);
      setHackathon(data);

      // Load meetings for this hackathon
      try {
        const hackathonMeetings = await meetingService.getHackathonMeetings(id!);
        setMeetings(hackathonMeetings);
      } catch (err) {
        // Silently fail - meetings are optional
        setMeetings([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hackathon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminders = async () => {
    if (!id) return;
    
    setIsSendingReminders(true);
    setReminderMessage('');
    try {
      const result = await hackathonService.sendReminders(id);
      
      // Build detailed message based on result
      let message = '';
      if (result.sent > 0 && result.skipped > 0) {
        message = `✅ Reminders sent to ${result.sent} users. ${result.skipped} users already have unread reminders (skipped to prevent duplicates).`;
      } else if (result.sent > 0) {
        message = `✅ Reminders sent successfully to ${result.sent} registered users.`;
      } else if (result.skipped > 0) {
        message = `ℹ️ All ${result.skipped} registered users already have unread reminders. No new reminders sent to prevent duplicates.`;
      } else {
        message = 'ℹ️ No registered users found for this hackathon.';
      }
      
      if (result.failed > 0) {
        message += ` ${result.failed} failed.`;
      }
      
      setReminderMessage(message);
      setTimeout(() => setReminderMessage(''), 8000); // Show longer for detailed message
    } catch (err: any) {
      setReminderMessage(err.response?.data?.message || 'Failed to send reminders');
      setTimeout(() => setReminderMessage(''), 5000);
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Status is automatically updated by backend based on dates
  // No manual status update needed

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' - ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading hackathon details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Hackathon not found</p>
            <Link to="/admin/hackathons" className="mt-4 text-blue-600 hover:text-blue-700">
              Back to Hackathons
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link
              to="/admin/hackathons"
              className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{hackathon.title}</h1>
          </div>

          {/* Purpose and Description */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Purpose</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{hackathon.purpose}</p>
            {hackathon.description && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-2 mt-4">Description</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{hackathon.description}</p>
              </>
            )}
          </div>

          {/* Event Schedule & Management - Single Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Schedule & Management</h2>
            
            {/* Three Column Layout: Calendar | Event Details | Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Calendar */}
              <div className="lg:col-span-1 border-r border-gray-200 pr-6">
                <Calendar hackathons={[hackathon]} meetings={meetings} />
              </div>

              {/* Middle Column - Event Details */}
              <div className="lg:col-span-1 border-r border-gray-200 pr-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
                <div className="space-y-4">
                  {/* Start Date */}
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Start Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDateShort(hackathon.startDate)}</p>
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">End Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDateShort(hackathon.endDate)}</p>
                    </div>
                  </div>

                  {/* Register By */}
                  {hackathon.registrationDeadline && (
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Register By</p>
                        <p className="text-sm font-medium text-gray-900">{formatDateShort(hackathon.registrationDeadline)}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                      <p className="text-sm font-medium text-gray-900">{hackathon.location}</p>
                    </div>
                  </div>

                  {/* Online Link */}
                  {hackathon.onlineLink && (
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Microsoft Teams Link</p>
                        <a
                          href={hackathon.onlineLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 break-all"
                        >
                          {hackathon.onlineLink}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Notifications */}
              <div className="lg:col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                </div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Send Event Reminders</h4>
                <p className="text-xs text-gray-600 mb-4">
                  Notify all registered users about the upcoming event. Duplicates are automatically prevented.
                </p>
                {reminderMessage && (
                  <div className={`mb-4 rounded-md p-2 text-xs ${
                    reminderMessage.includes('✅') || reminderMessage.includes('successfully')
                      ? 'bg-green-50 text-green-800' 
                      : reminderMessage.includes('ℹ️')
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {reminderMessage}
                  </div>
                )}
                <button
                  onClick={handleSendReminders}
                  disabled={isSendingReminders || hackathon.status === HackathonStatus.COMPLETED}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium mb-3"
                >
                  {isSendingReminders ? 'Sending...' : 'Send Reminder Blast'}
                </button>
                {hackathon.status === HackathonStatus.COMPLETED && (
                  <p className="text-xs text-gray-500">
                    Cannot send reminders for completed hackathons.
                  </p>
                )}
                {reminderMessage && reminderMessage.includes('✅') && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last sent just now
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonDetails;

