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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case HackathonStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-300';
      case HackathonStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusDisplayName = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.PENDING:
        return 'Upcoming';
      case HackathonStatus.ACTIVE:
        return 'Active';
      case HackathonStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  // Calculate status distribution for bars
  const allStatuses = [HackathonStatus.PENDING, HackathonStatus.ACTIVE, HackathonStatus.COMPLETED];
  const statusCounts = {
    [HackathonStatus.PENDING]: 0,
    [HackathonStatus.ACTIVE]: 0,
    [HackathonStatus.COMPLETED]: 0,
  };
  // For now, we'll show the current hackathon's status
  if (hackathon) {
    statusCounts[hackathon.status] = 1;
  }
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;

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
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              to="/admin/hackathons"
              className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
            >
              ← Back to Hackathons
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{hackathon.title}</h1>
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(hackathon.status)}`}>
                {getStatusDisplayName(hackathon.status)}
              </span>
            </div>
          </div>

          {/* Purpose */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Purpose</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{hackathon.purpose}</p>
          </div>

          {/* Description */}
          {hackathon.description && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{hackathon.description}</p>
            </div>
          )}

          {/* Event Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
                <p className="text-gray-900">{formatDate(hackathon.startDate)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">End Date</h3>
                <p className="text-gray-900">{formatDate(hackathon.endDate)}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                <p className="text-gray-900">{hackathon.location}</p>
              </div>
              {hackathon.onlineLink && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Microsoft Teams Link</h3>
                  <a
                    href={hackathon.onlineLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 break-all"
                  >
                    {hackathon.onlineLink}
                  </a>
                </div>
              )}
              {hackathon.registrationDeadline && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Register By</h3>
                  <p className="text-gray-900">{formatDate(hackathon.registrationDeadline)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Calendar View - Show full calendar with events */}
          <div className="mb-6">
            <Calendar hackathons={[hackathon]} meetings={meetings} />
          </div>

          {/* Status Bars */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hackathon Status</h2>
            <div className="space-y-4">
              {allStatuses.map((status) => {
                const count = statusCounts[status];
                const percentage = (count / total) * 100;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{getStatusDisplayName(status)}</span>
                      <span className="text-sm text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          status === HackathonStatus.PENDING
                            ? 'bg-yellow-500'
                            : status === HackathonStatus.ACTIVE
                            ? 'bg-green-500'
                            : 'bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Status is automatically updated based on start and end dates. 
              {hackathon.status === HackathonStatus.PENDING && ' Hackathon will become Active when the start date arrives.'}
              {hackathon.status === HackathonStatus.ACTIVE && ' Hackathon will become Completed when the end date passes.'}
              {hackathon.status === HackathonStatus.COMPLETED && ' This hackathon has ended.'}
            </p>
          </div>

          {/* Send Reminders */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Event Reminders</h2>
            <p className="text-sm text-gray-600 mb-4">
              Send reminder notifications to all registered users for this hackathon. 
              Users who already have an unread reminder will not receive duplicates.
            </p>
            {reminderMessage && (
              <div className={`mb-4 rounded-md p-3 text-sm ${
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSendingReminders ? 'Sending Reminders...' : 'Send Reminders to Registered Users'}
            </button>
            {hackathon.status === HackathonStatus.COMPLETED && (
              <p className="text-sm text-gray-500 mt-2">
                Cannot send reminders for completed hackathons.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonDetails;

