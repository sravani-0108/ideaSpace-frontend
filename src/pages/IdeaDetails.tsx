import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ideaService } from '../services/idea.service';
import { commentService } from '../services/comment.service';
import { likeService } from '../services/like.service';
import { adminService } from '../services/admin.service';
import { Idea, Comment, IdeaStatus, HackathonType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { projectService } from '../services/project.service';
import CommentItem from '../components/CommentItem';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../utils/user.util';
import { Link } from 'react-router-dom';

interface IdeaWithLikes extends Idea {
  comments?: Comment[];
  likes?: Array<{ userId: string }>;
}

const IdeaDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { refreshCount } = useNotifications();
  const [idea, setIdea] = useState<IdeaWithLikes | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [error, setError] = useState('');
  const [hasProject, setHasProject] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IdeaStatus>(IdeaStatus.PENDING);
  const [statusDeadline, setStatusDeadline] = useState('');
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Determine where to navigate back to
  const getBackPath = () => {
    const state = location.state as any;
    
    // Check if coming from admin hackathon details page
    if (state && state.fromAdminHackathon && state.hackathonId) {
      return `/admin/hackathons/${state.hackathonId}`;
    }
    
    // Check if coming from admin dashboard via location state
    if (state && state.fromAdmin) {
      return '/admin/dashboard?tab=allPosts';
    }
    
    // If idea has a hackathonId and user is admin/judge, navigate back to that hackathon
    if (idea?.hackathonId) {
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'JUDGE';
      if (isAdmin) {
        return `/admin/hackathons/${idea.hackathonId}`;
      }
    }
    
    // Default to home/dashboard
    return '/';
  };

  useEffect(() => {
    if (id) {
      loadIdea();
      if (user) {
        checkProject();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    if (idea) {
      setSelectedStatus(idea.status);
      if (idea.statusDeadline) {
        // Convert ISO date to datetime-local format
        const date = new Date(idea.statusDeadline);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setStatusDeadline(localDate.toISOString().slice(0, 16));
      } else {
        setStatusDeadline('');
      }
      // Show deadline input for statuses that require it
      setShowDeadlineInput(
        idea.status === IdeaStatus.PITCHING ||
        idea.status === IdeaStatus.ENHANCEMENTS ||
        idea.status === IdeaStatus.IMPLEMENTATION
      );
      // Load rejection reason if exists
      setRejectionReason(idea.rejectionReason || '');
    }
  }, [idea]);

  const checkProject = async () => {
    if (!id || !user) return;
    try {
      const project = await projectService.getProjectByIdeaId(id);
      setHasProject(!!project);
    } catch {
      setHasProject(false);
    }
  };

  const loadIdea = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await ideaService.getIdeaById(id!) as IdeaWithLikes;
      // Check if current user has liked this idea
      const isLiked = user && data.likes?.some((like) => like.userId === user.id);
      setIdea({ ...data, isLiked: !!isLiked });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load idea');
      // If admin and idea not found, it might be a visibility issue - try to show error with more context
      if (user && (user.role === 'ADMIN' || user.role === 'JUDGE')) {
        setError('Idea not found or not accessible. ' + (err.response?.data?.message || err.message || ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!idea) return;
    
    // Validate that a status is selected
    if (!selectedStatus) {
      setStatusMessage('Please select a status');
      setTimeout(() => setStatusMessage(''), 5000);
      return;
    }
    
    // Validate deadline for statuses that require it
    if ((selectedStatus === IdeaStatus.PITCHING || 
         selectedStatus === IdeaStatus.ENHANCEMENTS || 
         selectedStatus === IdeaStatus.IMPLEMENTATION) && !statusDeadline) {
      setStatusMessage('Please select a deadline date for this status');
      setTimeout(() => setStatusMessage(''), 5000);
      return;
    }
    
    // Clear deadline for REJECTED, COMPLETED, and UNDER_REVIEW statuses
    const finalDeadline = (selectedStatus === IdeaStatus.REJECTED || 
                          selectedStatus === IdeaStatus.COMPLETED || 
                          selectedStatus === IdeaStatus.UNDER_REVIEW)
      ? undefined
      : statusDeadline || undefined;

    setIsUpdatingStatus(true);
    setStatusMessage('');
    try {
      await adminService.updateIdeaStatus(idea.id, selectedStatus, {
        statusDeadline: finalDeadline,
        rejectionReason: selectedStatus === IdeaStatus.REJECTED ? rejectionReason : undefined,
      });
      // Reload idea to get updated status
      await loadIdea();
      setStatusMessage('Idea status updated successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.message || 'Failed to update idea status');
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as IdeaStatus;
    if (!newStatus) {
      // If empty option selected, reset to current idea status
      setSelectedStatus(idea?.status || IdeaStatus.PENDING);
      setShowDeadlineInput(false);
      setStatusDeadline('');
      setRejectionReason(idea?.rejectionReason || '');
      return;
    }
    setSelectedStatus(newStatus);
    // Show deadline input for statuses that require it
    setShowDeadlineInput(
      newStatus === IdeaStatus.PITCHING ||
      newStatus === IdeaStatus.ENHANCEMENTS ||
      newStatus === IdeaStatus.IMPLEMENTATION
    );
    // Clear deadline if status doesn't require it
    if (!showDeadlineInput && (newStatus === IdeaStatus.UNDER_REVIEW || newStatus === IdeaStatus.COMPLETED || newStatus === IdeaStatus.REJECTED)) {
      setStatusDeadline('');
    }
    // Clear rejection reason if status is not REJECTED
    if (newStatus !== IdeaStatus.REJECTED) {
      setRejectionReason('');
    } else {
      // If switching to REJECTED, keep existing rejection reason if any
      setRejectionReason(idea?.rejectionReason || '');
    }
  };

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'JUDGE');

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!idea) return;

    setIsTogglingLike(true);
    try {
      if (idea.isLiked) {
        await likeService.unlikeIdea(idea.id);
        setIdea({ ...idea, isLiked: false, likesCount: idea.likesCount - 1 });
      } else {
        await likeService.likeIdea(idea.id);
        setIdea({ ...idea, isLiked: true, likesCount: idea.likesCount + 1 });
        // Refresh notifications in case a new like notification was created
        refreshCount();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update like');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!newComment.trim() || !idea) return;

    setIsSubmittingComment(true);
    try {
      const comment = await commentService.createComment(idea.id, { content: newComment.trim() });
      const updatedComments = [...(idea.comments || []), comment];
      setIdea({ ...idea, comments: updatedComments, commentsCount: idea.commentsCount + 1 });
      setNewComment('');
      // Refresh notifications in case a new comment notification was created
      refreshCount();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!idea) return;

    try {
      await commentService.createComment(idea.id, { content, parentId });
      // Reload the idea to get properly structured comments with nested replies
      await loadIdea();
      refreshCount();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to post reply');
      throw err;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading idea...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Idea not found</p>
          <button
            onClick={() => navigate(getBackPath())}
            className="mt-4 text-blue-600 hover:text-blue-700 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(getBackPath())}
          className="mb-4 text-blue-600 hover:text-blue-700 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {statusMessage && (
          <div className={`mb-4 rounded-md p-3 text-sm ${
            statusMessage.includes('successfully')
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            {statusMessage}
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{idea.title}</h1>
            {/* Status Dropdown for Admin */}
            {isAdmin && idea.hackathonId && idea.hackathon?.hackathonType === HackathonType.HANDS_ON && (
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-2">
                  <label htmlFor="idea-status-select" className="text-sm font-medium text-gray-700">
                    Status:
                  </label>
                  <select
                    id="idea-status-select"
                    value={selectedStatus || ''}
                    onChange={handleStatusSelectChange}
                    disabled={isUpdatingStatus}
                    className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Status</option>
                    <option value={IdeaStatus.UNDER_REVIEW}>Under Review</option>
                    <option value={IdeaStatus.PITCHING}>Pitching</option>
                    <option value={IdeaStatus.ENHANCEMENTS}>Enhancements</option>
                    <option value={IdeaStatus.IMPLEMENTATION}>Implementation</option>
                    <option value={IdeaStatus.COMPLETED}>Completed</option>
                    <option value={IdeaStatus.REJECTED}>Rejected</option>
                  </select>
                </div>
                {showDeadlineInput && (
                  <div className="flex items-center space-x-2">
                    <label htmlFor="status-deadline" className="text-sm font-medium text-gray-700">
                      Deadline:
                    </label>
                    <input
                      type="datetime-local"
                      id="status-deadline"
                      value={statusDeadline}
                      onChange={(e) => setStatusDeadline(e.target.value)}
                      disabled={isUpdatingStatus}
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
                {(selectedStatus === IdeaStatus.REJECTED) && (
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="rejection-reason" className="text-sm font-medium text-red-700">
                      Rejection Reason:
                    </label>
                    <textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason (optional)..."
                      disabled={isUpdatingStatus}
                      rows={3}
                      className="px-3 py-2 border border-red-300 rounded-md bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                  </div>
                )}
                <button
                  onClick={handleStatusChange}
                  disabled={isUpdatingStatus || !selectedStatus || (showDeadlineInput && !statusDeadline)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </button>
                {isUpdatingStatus && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            )}
            {/* Show submit/update project button for Hands-On hackathons based on status and deadline */}
            {idea.hackathonId && 
             idea.hackathon?.hackathonType === HackathonType.HANDS_ON &&
             user && (user.id === idea.user?.id || user.id === idea.author?.id) && 
             (idea.status === IdeaStatus.ENHANCEMENTS || idea.status === IdeaStatus.IMPLEMENTATION) && (
              (() => {
                const canSubmit = idea.statusDeadline 
                  ? new Date() <= new Date(idea.statusDeadline)
                  : true;
                
                return canSubmit ? (
                  <Link
                    to={`/ideas/${idea.id}/submit-project`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
                  >
                    {hasProject ? 'Update Project' : 'Submit Project'}
                  </Link>
                ) : (
                  <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-md font-medium text-sm cursor-not-allowed">
                    Deadline Passed
                  </span>
                );
              })()
            )}
          </div>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">{idea.description}</p>
          
          {/* Show file attachments if available */}
          {(idea.gitRepositoryUrl || idea.documentationUrl || idea.videoUrl || idea.zipFilePath) && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {idea.gitRepositoryUrl && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Git Repository</p>
                    <a
                      href={idea.gitRepositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 break-all"
                    >
                      {idea.gitRepositoryUrl}
                    </a>
                  </div>
                )}
                {idea.documentationUrl && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Documentation</p>
                    <a
                      href={idea.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View Documentation
                    </a>
                  </div>
                )}
                {idea.videoUrl && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Video</p>
                    <a
                      href={idea.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View Video
                    </a>
                  </div>
                )}
                {idea.zipFilePath && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">ZIP File</p>
                    <a
                      href={idea.zipFilePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Download ZIP
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Approval Message for Hands-On Hackathons */}
            {(idea.status === IdeaStatus.APPROVED || idea.status === IdeaStatus.PUBLISHED) && 
             idea.hackathonId && 
             (idea.hackathon?.hackathonType === HackathonType.HANDS_ON || !idea.hackathon) &&
             user && (user.id === idea.user?.id || user.id === idea.author?.id) &&
             !hasProject && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-2">Your idea is approved!</p>
                  {idea.projectDeadline ? (
                    <p className="text-sm text-green-700 mb-2">
                      <span className="font-medium">Project Submission Deadline:</span>{' '}
                      {new Date(idea.projectDeadline).toLocaleString()}
                      {new Date() > new Date(idea.projectDeadline) && (
                        <span className="ml-2 text-red-600 font-medium">⚠️ Deadline has passed</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-green-700 mb-2">You can now submit your project implementation.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Only show project deadline to the idea owner */}
          {idea.projectDeadline && 
           idea.status !== IdeaStatus.APPROVED && 
           user && (user.id === idea.user?.id || user.id === idea.author?.id) && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800">Project Deadline:</p>
              <p className="text-blue-900">{new Date(idea.projectDeadline).toLocaleString()}</p>
            </div>
          )}
          
          {idea.rejectionReason && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
              <p className="text-red-700">{idea.rejectionReason}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-4">
              {/* User Profile Avatar */}
              {(() => {
                const author = idea.user || idea.author;
                const authorName = getUserDisplayName(author);
                const authorInitials = getUserInitials(author);
                const profilePicUrl = getProfilePictureUrl(author);
                
                return (
                  <div className="flex items-center space-x-3" style={{ flexDirection: 'row' }}>
                    {/* Avatar first - explicitly ordered */}
                    {profilePicUrl ? (
                      <img
                        src={profilePicUrl}
                        alt={authorName}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        style={{ order: 1 }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0';
                          fallback.style.order = '1';
                          fallback.textContent = authorInitials;
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0"
                        style={{ order: 1 }}
                      >
                        {authorInitials}
                      </div>
                    )}
                    {/* Name and date after avatar - explicitly ordered */}
                    <div className="flex flex-col" style={{ order: 2 }}>
                      <span className="text-sm font-medium text-gray-900">{authorName}</span>
                      <span className="text-xs text-gray-500">{formatDate(idea.createdAt)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={handleLike}
              disabled={isTogglingLike || !isAuthenticated}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                idea.isLiked
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg
                className={`w-5 h-5 ${idea.isLiked ? 'fill-current' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{idea.likesCount}</span>
            </button>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Comments ({idea.commentsCount})
          </h2>

          {isAuthenticated && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          )}

          {!isAuthenticated && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md text-center">
              <p className="text-gray-600 mb-2">Please log in to comment</p>
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Login
              </button>
            </div>
          )}

          <div className="space-y-6">
            {(!idea.comments || idea.comments.length === 0) ? (
              <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
            ) : (
              idea.comments
                .filter((comment) => !comment.parentId) // Only show top-level comments
                .map((comment) => (
                  <div key={comment.id} className="border-b pb-4 last:border-0">
                    <CommentItem
                      comment={comment}
                      ideaId={idea.id}
                      onReply={handleReply}
                    />
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaDetails;

