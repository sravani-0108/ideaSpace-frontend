import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ideaService } from '../services/idea.service';
import { commentService } from '../services/comment.service';
import { likeService } from '../services/like.service';
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
      const data = await ideaService.getIdeaById(id!) as IdeaWithLikes;
      // Check if current user has liked this idea
      const isLiked = user && data.likes?.some((like) => like.userId === user.id);
      setIdea({ ...data, isLiked: !!isLiked });
      
      // Debug logging
      console.log('Idea loaded:', {
        id: data.id,
        status: data.status,
        hackathonId: data.hackathonId,
        hasHackathon: !!data.hackathon,
        hackathonType: data.hackathon?.hackathonType,
        userId: data.user?.id || data.author?.id,
        currentUserId: user?.id,
        isOwner: user && (user.id === data.user?.id || user.id === data.author?.id),
        projectDeadline: data.projectDeadline
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load idea');
    } finally {
      setIsLoading(false);
    }
  };

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

        <div className="bg-white shadow-md rounded-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{idea.title}</h1>
            {(idea.status === IdeaStatus.APPROVED || idea.status === IdeaStatus.PUBLISHED) && 
             idea.hackathonId && 
             idea.hackathon?.hackathonType === HackathonType.HANDS_ON &&
             user && (user.id === idea.user?.id || user.id === idea.author?.id) && (
              <Link
                to={`/ideas/${idea.id}/submit-project`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
              >
                {hasProject ? 'Update Project' : 'Submit Project'}
              </Link>
            )}
          </div>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">{idea.description}</p>
          
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
                  <div className="flex items-center space-x-3">
                    {profilePicUrl ? (
                      <img
                        src={profilePicUrl}
                        alt={authorName}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium';
                          fallback.textContent = authorInitials;
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {authorInitials}
                      </div>
                    )}
                    <div className="flex flex-col">
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

