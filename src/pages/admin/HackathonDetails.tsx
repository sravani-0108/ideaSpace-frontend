import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { ideaService } from '../../services/idea.service';
import { adminService } from '../../services/admin.service';
import { teamService } from '../../services/team.service';
import { Hackathon, HackathonStatus, HackathonType, Idea, IdeaStatus, Team, HackathonRegistration } from '../../types';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../../utils/user.util';
import AdminSidebar from '../../components/AdminSidebar';
import Calendar from '../../components/Calendar';

const HackathonDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, HackathonRegistration[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [error, setError] = useState('');
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [updatingIdeaId, setUpdatingIdeaId] = useState<string | null>(null);
  const [ideaStatusChanges, setIdeaStatusChanges] = useState<Record<string, { status: IdeaStatus; deadline: string; rejectionReason?: string }>>({});

  useEffect(() => {
    if (id) {
      loadHackathon();
    }
  }, [id]);

  useEffect(() => {
    // Only load ideas for Hands-On hackathons
    if (id && hackathon && hackathon.hackathonType === HackathonType.HANDS_ON) {
      loadIdeas();
    } else if (hackathon && hackathon.hackathonType !== HackathonType.HANDS_ON) {
      // Clear ideas for Learning hackathons
      setIdeas([]);
    }
  }, [id, hackathon]);

  const loadHackathon = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await hackathonService.getHackathonById(id!);
      setHackathon(data);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hackathon');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIdeas = async () => {
    if (!id) return;
    try {
      setIsLoadingIdeas(true);
      setError('');
      const data = await ideaService.getHandsOnHackathonIdeas(id);
      setIdeas(data);
      
      // Load teams and team members for this hackathon
      try {
        const hackathonTeams = await teamService.getTeamsByHackathon(id);
        setTeams(hackathonTeams);
        
        // Load team members for each team
        const membersMap: Record<string, HackathonRegistration[]> = {};
        for (const team of hackathonTeams) {
          try {
            const members = await teamService.getTeamMembers(team.id);
            membersMap[team.id] = members;
          } catch (err) {
            membersMap[team.id] = [];
          }
        }
        setTeamMembersMap(membersMap);
      } catch (err) {
        // Teams are optional, continue without them
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ideas');
      setIdeas([]);
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const handleIdeaStatusChange = async (ideaId: string, newStatus: IdeaStatus, statusDeadline?: string, rejectionReason?: string) => {
    setUpdatingIdeaId(ideaId);
    try {
      await adminService.updateIdeaStatus(ideaId, newStatus, {
        statusDeadline: statusDeadline,
        rejectionReason: rejectionReason,
      });
      // Reload ideas to get updated status
      await loadIdeas();
      // Clear the status change for this idea
      const newChanges = { ...ideaStatusChanges };
      delete newChanges[ideaId];
      setIdeaStatusChanges(newChanges);
      setStatusMessage('Idea status updated successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.message || 'Failed to update idea status');
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setUpdatingIdeaId(null);
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

  const handleStatusChange = async (newStatus: HackathonStatus) => {
    if (!id || !hackathon) return;
    
    setIsUpdatingStatus(true);
    setStatusMessage('');
    try {
      const updatedHackathon = await hackathonService.updateStatus(id, newStatus);
      setHackathon(updatedHackathon);
      setStatusMessage('Status updated successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusDisplayName = (status: HackathonStatus, hackathonType?: HackathonType) => {
    if (hackathonType === HackathonType.HANDS_ON) {
      switch (status) {
        case HackathonStatus.DRAFT:
          return 'Draft';
        case HackathonStatus.OPEN:
          return 'Open';
        case HackathonStatus.CLOSED:
          return 'Closed';
        default:
          return status;
      }
    } else {
      switch (status) {
        case HackathonStatus.PENDING:
          return 'Pending';
        case HackathonStatus.ACTIVE:
          return 'Active';
        case HackathonStatus.COMPLETED:
          return 'Completed';
        default:
          return status;
      }
    }
  };

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
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{hackathon.title}</h1>
            
            {/* Status Dropdown - Only show for Hands-On hackathons */}
            {hackathon.hackathonType === HackathonType.HANDS_ON && (
              <div className="flex items-center space-x-3">
                <label htmlFor="status-select" className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <select
                  id="status-select"
                  value={hackathon.status}
                  onChange={(e) => handleStatusChange(e.target.value as HackathonStatus)}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={HackathonStatus.DRAFT}>{getStatusDisplayName(HackathonStatus.DRAFT, HackathonType.HANDS_ON)}</option>
                  <option value={HackathonStatus.OPEN}>{getStatusDisplayName(HackathonStatus.OPEN, HackathonType.HANDS_ON)}</option>
                  <option value={HackathonStatus.CLOSED}>{getStatusDisplayName(HackathonStatus.CLOSED, HackathonType.HANDS_ON)}</option>
                </select>
                {isUpdatingStatus && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            )}
          </div>

          {statusMessage && (
            <div className={`mb-4 rounded-md p-3 text-sm ${
              statusMessage.includes('successfully')
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {statusMessage}
            </div>
          )}

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
                <Calendar hackathons={[hackathon]} />
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
                        <p className="text-xs font-medium text-gray-500 mb-1">Online Event Link</p>
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
                  {isSendingReminders ? 'Sending...' : 'Send Reminder'}
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

          {/* Submitted Ideas Section - Only for Hands-On Hackathons */}
          {hackathon?.hackathonType === HackathonType.HANDS_ON && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Submissions ({ideas.length})
            </h2>
            
            {isLoadingIdeas ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading ideas...</p>
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No ideas submitted yet for this hackathon</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ideas.map((idea) => {
                  const authorName = getUserDisplayName(idea.user || idea.author);
                  const authorInitials = getUserInitials(idea.user || idea.author);
                  const profilePicUrl = getProfilePictureUrl(idea.user || idea.author);

                  const getIdeaStatusBadge = (status: string) => {
                    const badges: Record<string, string> = {
                      'PENDING': 'bg-yellow-100 text-yellow-800',
                      'UNDER_REVIEW': 'bg-purple-100 text-purple-800',
                      'PITCHING': 'bg-blue-100 text-blue-800',
                      'ENHANCEMENTS': 'bg-orange-100 text-orange-800',
                      'IMPLEMENTATION': 'bg-indigo-100 text-indigo-800',
                      'COMPLETED': 'bg-green-100 text-green-800',
                      'APPROVED': 'bg-green-100 text-green-800',
                      'REJECTED': 'bg-red-100 text-red-800',
                      'PUBLISHED': 'bg-blue-100 text-blue-800',
                    };
                    return badges[status] || 'bg-gray-100 text-gray-800';
                  };

                  const getStatusDisplay = (status: IdeaStatus) => {
                    const statusMap: Record<string, string> = {
                      [IdeaStatus.PENDING]: 'Submitted',
                      [IdeaStatus.UNDER_REVIEW]: 'Under Review',
                      [IdeaStatus.PITCHING]: 'Pitching',
                      [IdeaStatus.ENHANCEMENTS]: 'Enhancements',
                      [IdeaStatus.IMPLEMENTATION]: 'Implementation',
                      [IdeaStatus.COMPLETED]: 'Completed',
                      [IdeaStatus.APPROVED]: 'Approved',
                      [IdeaStatus.REJECTED]: 'Rejected',
                      [IdeaStatus.PUBLISHED]: 'Published',
                    };
                    return statusMap[status] || status.charAt(0) + status.slice(1).toLowerCase();
                  };

                  const currentStatusChange = ideaStatusChanges[idea.id] || { 
                    status: idea.status, 
                    deadline: idea.statusDeadline ? (() => {
                      const date = new Date(idea.statusDeadline);
                      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                      return localDate.toISOString().slice(0, 16);
                    })() : '',
                    rejectionReason: idea.rejectionReason || ''
                  };
                  const needsDeadline = currentStatusChange.status === IdeaStatus.PITCHING || 
                                       currentStatusChange.status === IdeaStatus.ENHANCEMENTS || 
                                       currentStatusChange.status === IdeaStatus.IMPLEMENTATION;

                  return (
                    <div
                      key={idea.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {profilePicUrl ? (
                            <img
                              src={profilePicUrl}
                              alt={authorName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0';
                                fallback.textContent = authorInitials;
                                target.parentNode?.appendChild(fallback);
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {authorInitials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{authorName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(idea.createdAt).toLocaleDateString()}
                            </p>
                            {/* Show team information if user is in a team */}
                            {(() => {
                              // Find team for this user
                              const ideaUserId = idea.user?.id;
                              if (!ideaUserId) return null;
                              
                              const userTeam = teams.find(team => {
                                const members = teamMembersMap[team.id] || [];
                                return members.some(member => member.userId === ideaUserId);
                              });
                              
                              if (userTeam) {
                                const teamMembers = teamMembersMap[userTeam.id] || [];
                                const memberNames = teamMembers
                                  .map(member => getUserDisplayName(member.user))
                                  .filter(Boolean);
                                
                                return (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-medium text-blue-700 mb-1">
                                      Team: {userTeam.name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Members: {memberNames.join(', ')}
                                    </p>
                                    {memberNames.length > 1 && (
                                      <p className="text-xs text-gray-500 mt-1 italic">
                                        Submission by: {authorName}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getIdeaStatusBadge(idea.status)}`}>
                            {getStatusDisplay(idea.status)}
                          </span>
                          {/* Status Dropdown - Only show Hands-On hackathon statuses */}
                          {idea.hackathon?.hackathonType === HackathonType.HANDS_ON ? (
                            <div className="flex flex-col items-end space-y-1 w-full">
                              <select
                                value={currentStatusChange.status || ''}
                                onChange={(e) => {
                                  const newStatus = e.target.value as IdeaStatus;
                                  if (!newStatus) return; // Don't update if empty option selected
                                  setIdeaStatusChanges({
                                    ...ideaStatusChanges,
                                    [idea.id]: {
                                      status: newStatus,
                                      deadline: (newStatus === IdeaStatus.PITCHING || 
                                                 newStatus === IdeaStatus.ENHANCEMENTS || 
                                                 newStatus === IdeaStatus.IMPLEMENTATION) 
                                        ? currentStatusChange.deadline 
                                        : (newStatus === IdeaStatus.REJECTED || 
                                           newStatus === IdeaStatus.COMPLETED || 
                                           newStatus === IdeaStatus.UNDER_REVIEW)
                                          ? ''
                                          : currentStatusChange.deadline,
                                      rejectionReason: newStatus === IdeaStatus.REJECTED 
                                        ? (currentStatusChange.rejectionReason || '') 
                                        : ''
                                    }
                                  });
                                }}
                                disabled={updatingIdeaId === idea.id}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                              >
                                <option value="">Select Status</option>
                                <option value={IdeaStatus.UNDER_REVIEW}>Under Review</option>
                                <option value={IdeaStatus.PITCHING}>Pitching</option>
                                <option value={IdeaStatus.ENHANCEMENTS}>Enhancements</option>
                                <option value={IdeaStatus.IMPLEMENTATION}>Implementation</option>
                                <option value={IdeaStatus.COMPLETED}>Completed</option>
                                <option value={IdeaStatus.REJECTED}>Rejected</option>
                              </select>
                              {needsDeadline && (
                                <input
                                  type="datetime-local"
                                  value={currentStatusChange.deadline}
                                  onChange={(e) => {
                                    setIdeaStatusChanges({
                                      ...ideaStatusChanges,
                                      [idea.id]: {
                                        ...currentStatusChange,
                                        deadline: e.target.value
                                      }
                                    });
                                  }}
                                  disabled={updatingIdeaId === idea.id}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                />
                              )}
                              {(currentStatusChange.status === IdeaStatus.REJECTED) && (
                                <textarea
                                  value={currentStatusChange.rejectionReason || ''}
                                  onChange={(e) => {
                                    setIdeaStatusChanges({
                                      ...ideaStatusChanges,
                                      [idea.id]: {
                                        ...currentStatusChange,
                                        rejectionReason: e.target.value
                                      }
                                    });
                                  }}
                                  placeholder="Enter rejection reason (optional)..."
                                  disabled={updatingIdeaId === idea.id}
                                  rows={3}
                                  className="px-2 py-1 text-xs border border-red-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none w-full"
                                />
                              )}
                              <button
                                onClick={() => handleIdeaStatusChange(
                                  idea.id, 
                                  currentStatusChange.status,
                                  currentStatusChange.deadline || undefined,
                                  currentStatusChange.rejectionReason || undefined
                                )}
                                disabled={updatingIdeaId === idea.id || !currentStatusChange.status || (needsDeadline && !currentStatusChange.deadline)}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                              >
                                {updatingIdeaId === idea.id ? 'Updating...' : 'Update'}
                              </button>
                            </div>
                          ) : (
                            <select
                              value={idea.status}
                              onChange={(e) => handleIdeaStatusChange(idea.id, e.target.value as IdeaStatus)}
                              disabled={updatingIdeaId === idea.id}
                              className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value={IdeaStatus.PENDING}>Submitted</option>
                              <option value={IdeaStatus.APPROVED}>Approved</option>
                              <option value={IdeaStatus.REJECTED}>Rejected</option>
                              <option value={IdeaStatus.PUBLISHED}>Published</option>
                            </select>
                          )}
                          {updatingIdeaId === idea.id && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{idea.title}</h4>
                      {idea.description && (
                        <p className="text-xs text-gray-600 line-clamp-3 mb-3">{idea.description}</p>
                      )}
                      {idea.rejectionReason && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                          <p className="text-xs text-red-700">{idea.rejectionReason}</p>
                        </div>
                      )}
                      {/* Show file attachments if available */}
                      {(idea.gitRepositoryUrl || idea.documentationUrl || idea.videoUrl || idea.zipFilePath) && (
                        <div className="mb-3 space-y-1">
                          {idea.gitRepositoryUrl && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Git:</span>{' '}
                              <a href={idea.gitRepositoryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                {idea.gitRepositoryUrl}
                              </a>
                            </div>
                          )}
                          {idea.documentationUrl && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Doc:</span>{' '}
                              <a href={idea.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View
                              </a>
                            </div>
                          )}
                          {idea.videoUrl && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Video:</span>{' '}
                              <a href={idea.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View
                              </a>
                            </div>
                          )}
                          {idea.zipFilePath && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">ZIP:</span>{' '}
                              <a href={idea.zipFilePath} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Download
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      <Link
                        to={`/ideas/${idea.id}`}
                        state={{ fromAdminHackathon: true, hackathonId: id }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HackathonDetails;

