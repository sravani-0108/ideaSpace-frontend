import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { ideaService } from '../../services/idea.service';
import { adminService } from '../../services/admin.service';
import { Hackathon, HackathonType, Idea, IdeaStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LeftSidebar from '../../components/LeftSidebar';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../../utils/user.util';

const Review = () => {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [error, setError] = useState('');
  const [updatingIdeaId, setUpdatingIdeaId] = useState<string | null>(null);
  const [ideaStatusChanges, setIdeaStatusChanges] = useState<Record<string, { status: IdeaStatus; deadline: string; rejectionReason?: string }>>({});

  useEffect(() => {
    loadHackathons();
  }, []);

  useEffect(() => {
    if (selectedHackathonId) {
      loadIdeas(selectedHackathonId);
    } else {
      setIdeas([]);
    }
  }, [selectedHackathonId]);

  const loadHackathons = async () => {
    try {
      setIsLoading(true);
      setError('');
      const allHackathons = await hackathonService.getAllHackathons();
      
      // Filter only Hands-On hackathons where user is assigned as judge
      const assignedHackathons = allHackathons.filter(hackathon => {
        if (hackathon.hackathonType !== HackathonType.HANDS_ON) {
          return false;
        }
        
        // Handle judgeIds - it might be a string (from simple-array) or an array
        let judgeIdsArray: string[] = [];
        const judgeIdsValue = hackathon.judgeIds;
        if (judgeIdsValue) {
          if (Array.isArray(judgeIdsValue)) {
            judgeIdsArray = judgeIdsValue;
          } else {
            // Handle case where it might be a string (from simple-array serialization)
            const judgeIdsStr = String(judgeIdsValue);
            if (judgeIdsStr.length > 0) {
              judgeIdsArray = judgeIdsStr.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
            }
          }
        }
        
        // If no judges assigned, skip (user needs to be explicitly assigned)
        if (judgeIdsArray.length === 0) {
          return false;
        }
        
        // Check if user is in the judgeIds array
        return judgeIdsArray.includes(user!.id);
      });
      
      setHackathons(assignedHackathons);
      
      // Auto-select first hackathon if available
      if (assignedHackathons.length > 0 && !selectedHackathonId) {
        setSelectedHackathonId(assignedHackathons[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hackathons');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIdeas = async (hackathonId: string) => {
    try {
      setIsLoadingIdeas(true);
      setError('');
      const data = await ideaService.getHandsOnHackathonIdeas(hackathonId);
      setIdeas(data);
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
      await loadIdeas(selectedHackathonId!);
      const newChanges = { ...ideaStatusChanges };
      delete newChanges[ideaId];
      setIdeaStatusChanges(newChanges);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update idea status');
    } finally {
      setUpdatingIdeaId(null);
    }
  };

  const getStatusBadge = (status: IdeaStatus) => {
    const badges: Record<IdeaStatus, string> = {
      [IdeaStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [IdeaStatus.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
      [IdeaStatus.PITCHING]: 'bg-blue-100 text-blue-800',
      [IdeaStatus.ENHANCEMENTS]: 'bg-orange-100 text-orange-800',
      [IdeaStatus.IMPLEMENTATION]: 'bg-indigo-100 text-indigo-800',
      [IdeaStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [IdeaStatus.APPROVED]: 'bg-green-100 text-green-800',
      [IdeaStatus.REJECTED]: 'bg-red-100 text-red-800',
      [IdeaStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusDisplay = (status: IdeaStatus) => {
    const statusMap: Record<IdeaStatus, string> = {
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
    return statusMap[status] || status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            <LeftSidebar />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading hackathons...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <LeftSidebar />
          
          <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Review Hackathons</h1>
            <p className="mt-2 text-gray-600">Review and manage ideas for assigned hackathons</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {hackathons.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">You are not assigned as a judge to any hackathons.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hackathon Selector */}
              <div className="bg-white rounded-lg shadow-md p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Hackathon</label>
                <select
                  value={selectedHackathonId || ''}
                  onChange={(e) => setSelectedHackathonId(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a hackathon --</option>
                  {hackathons.map((hackathon) => (
                    <option key={hackathon.id} value={hackathon.id}>
                      {hackathon.title} - {new Date(hackathon.startDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Hackathon Details */}
              {selectedHackathonId && (() => {
                const selectedHackathon = hackathons.find(h => h.id === selectedHackathonId);
                if (!selectedHackathon) return null;
                
                return (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">{selectedHackathon.title}</h2>
                    <p className="text-gray-600 mb-4">{selectedHackathon.purpose}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Start Date:</span>{' '}
                        <span className="text-gray-600">{new Date(selectedHackathon.startDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">End Date:</span>{' '}
                        <span className="text-gray-600">{new Date(selectedHackathon.endDate).toLocaleDateString()}</span>
                      </div>
                      {selectedHackathon.registrationDeadline && (
                        <div>
                          <span className="font-medium text-gray-700">Registration Deadline:</span>{' '}
                          <span className="text-gray-600">{new Date(selectedHackathon.registrationDeadline).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>{' '}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedHackathon.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                          selectedHackathon.status === 'CLOSED' ? 'bg-red-100 text-red-800' :
                          selectedHackathon.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedHackathon.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Submitted Ideas */}
              {selectedHackathonId && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Submitted Ideas ({ideas.length})
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ideas.map((idea) => {
                        const authorName = getUserDisplayName(idea.user || idea.author);
                        const authorInitials = getUserInitials(idea.user || idea.author);
                        const profilePicUrl = getProfilePictureUrl(idea.user || idea.author);

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
                          <div key={idea.id} className="border border-gray-200 rounded-lg p-4">
                            {/* User Profile Section - Show First */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                {profilePicUrl ? (
                                  <img
                                    src={profilePicUrl}
                                    alt={authorName}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    onError={(e) => {
                                      // Fallback to initials if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = document.createElement('div');
                                      fallback.className = 'w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0';
                                      fallback.textContent = authorInitials;
                                      target.parentNode?.insertBefore(fallback, target);
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                    {authorInitials}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-gray-900">{authorName}</span>
                                  <span className="text-xs text-gray-500">{new Date(idea.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(idea.status)}`}>
                                {getStatusDisplay(idea.status)}
                              </span>
                            </div>

                            {/* Idea Details Section */}
                            <div className="mb-4">
                              <Link
                                to={`/ideas/${idea.id}`}
                                className="text-lg font-semibold text-gray-900 hover:text-blue-600 block mb-2"
                              >
                                {idea.title}
                              </Link>
                              <p className="text-sm text-gray-600 line-clamp-2">{idea.description}</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="space-y-2">
                                <select
                                  value={currentStatusChange.status || ''}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as IdeaStatus;
                                    if (!newStatus) return;
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
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                )}

                                {currentStatusChange.status === IdeaStatus.REJECTED && (
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
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
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
                                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                >
                                  {updatingIdeaId === idea.id ? 'Updating...' : 'Update Status'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!selectedHackathonId && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500">Select a hackathon to view details and submitted ideas</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;

