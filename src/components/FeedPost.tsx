import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Idea, Comment } from '../types';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../utils/user.util';
import { useAuth } from '../contexts/AuthContext';
import { savedIdeaService } from '../services/savedIdea.service';
import { likeService } from '../services/like.service';
import { commentService } from '../services/comment.service';
import { ideaService } from '../services/idea.service';
import { useNotifications } from '../contexts/NotificationContext';
import CommentItem from './CommentItem';

interface FeedPostProps {
  idea: Idea;
  onUpdate?: (updatedIdea: Idea) => void;
}

const FeedPost = ({ idea: initialIdea, onUpdate }: FeedPostProps) => {
  const { isAuthenticated, user } = useAuth();
  const { refreshCount } = useNotifications();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<Idea>(initialIdea);
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const COMMENTS_TO_SHOW = 3;
  const DESCRIPTION_PREVIEW_LENGTH = 150;

  useEffect(() => {
    setIdea(initialIdea);
  }, [initialIdea]);

  useEffect(() => {
    if (isAuthenticated) {
      checkSavedStatus();
    }
  }, [idea.id, isAuthenticated]);

  useEffect(() => {
    if (showComments && idea.commentsCount > 0) {
      loadComments();
    }
  }, [showComments, idea.id]);

  const checkSavedStatus = async () => {
    try {
      const saved = await savedIdeaService.checkSavedStatus(idea.id);
      setIsSaved(saved);
    } catch (error) {
      // Silently fail - user might not be authenticated
    }
  };

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const ideaDetails = await ideaService.getIdeaById(idea.id);
      setComments(ideaDetails.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsTogglingSave(true);
    try {
      if (isSaved) {
        await savedIdeaService.unsaveIdea(idea.id);
        setIsSaved(false);
      } else {
        await savedIdeaService.saveIdea(idea.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setIsTogglingSave(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsTogglingLike(true);
    try {
      const wasLiked = idea.isLiked;
      if (wasLiked) {
        await likeService.unlikeIdea(idea.id);
        const updatedIdea = { ...idea, isLiked: false, likesCount: (idea.likesCount || 0) - 1 };
        setIdea(updatedIdea);
        if (onUpdate) onUpdate(updatedIdea);
      } else {
        await likeService.likeIdea(idea.id);
        const updatedIdea = { ...idea, isLiked: true, likesCount: (idea.likesCount || 0) + 1 };
        setIdea(updatedIdea);
        if (onUpdate) onUpdate(updatedIdea);
        refreshCount();
      }
    } catch (error: any) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;

    setIsSubmittingComment(true);
    try {
      const comment = await commentService.createComment(idea.id, { content: newComment.trim() });
      setComments([comment, ...comments]);
      const updatedIdea = { ...idea, commentsCount: (idea.commentsCount || 0) + 1 };
      setIdea(updatedIdea);
      if (onUpdate) onUpdate(updatedIdea);
      setNewComment('');
      refreshCount();
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReply = async (parentId: string, content: string): Promise<void> => {
    await commentService.createComment(idea.id, { content, parentId });
    // Reload comments to get updated structure
    await loadComments();
    const updatedIdea = { ...idea, commentsCount: (idea.commentsCount || 0) + 1 };
    setIdea(updatedIdea);
    if (onUpdate) onUpdate(updatedIdea);
    refreshCount();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInDays = Math.floor(diffInSeconds / 86400);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return '1d';
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const author = idea.user || idea.author;
  const authorName = getUserDisplayName(author);
  const authorInitial = getUserInitials(author);
  const authorId = (author as any)?.id;
  const profilePicUrl = getProfilePictureUrl(author);
  const topLevelComments = comments.filter(c => !c.parentId);
  const displayedComments = showAllComments ? topLevelComments : topLevelComments.slice(0, COMMENTS_TO_SHOW);
  const hasMoreComments = topLevelComments.length > COMMENTS_TO_SHOW;

  const handleAuthorClick = () => {
    if (authorId) {
      navigate(`/users/${authorId}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-row items-center space-x-3">
          {/* Avatar - MUST BE FIRST ELEMENT - Order: 1 */}
          {profilePicUrl ? (
            <img
              key={`${authorId}-${(author as any)?.profilePicture || 'no-pic'}`}
              src={profilePicUrl}
              alt={authorName}
              onClick={handleAuthorClick}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all order-1"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all order-1';
                fallback.textContent = authorInitial;
                fallback.onclick = handleAuthorClick;
                target.parentNode?.appendChild(fallback);
              }}
            />
          ) : (
            <div 
              onClick={handleAuthorClick}
              className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all order-1"
            >
              {authorInitial}
            </div>
          )}
          {/* Name - MUST BE SECOND ELEMENT AFTER AVATAR - Order: 2 */}
          <h3 
            onClick={handleAuthorClick}
            className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors order-2"
          >
            {authorName}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <span className="text-gray-500 text-sm">{formatDate(idea.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{idea.title}</h2>
        <div className="text-gray-700 text-sm">
          {showFullDescription || idea.description.length <= DESCRIPTION_PREVIEW_LENGTH ? (
            <p className="whitespace-pre-wrap">{idea.description}</p>
          ) : (
            <>
              <p>{idea.description.substring(0, DESCRIPTION_PREVIEW_LENGTH)}...</p>
              <button
                onClick={() => setShowFullDescription(true)}
                className="text-blue-600 hover:text-blue-700 font-medium mt-1"
              >
                Show more
              </button>
            </>
          )}
          {showFullDescription && idea.description.length > DESCRIPTION_PREVIEW_LENGTH && (
            <button
              onClick={() => setShowFullDescription(false)}
              className="text-blue-600 hover:text-blue-700 font-medium mt-1 block"
            >
              Show less
            </button>
          )}
        </div>
      </div>

      {/* Footer - Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={isTogglingLike || !isAuthenticated}
            className={`flex items-center space-x-1.5 transition-colors ${
              idea.isLiked
                ? 'text-red-600 hover:text-red-700'
                : 'text-gray-600 hover:text-red-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg
              className={`w-5 h-5 ${idea.isLiked ? 'fill-current' : ''}`}
              fill={idea.isLiked ? 'currentColor' : 'none'}
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
            <span className="text-sm font-medium">{idea.likesCount || 0}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            className="flex items-center space-x-1.5 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">{idea.commentsCount || 0}</span>
          </button>
        </div>

        {/* Save Button */}
        {isAuthenticated && (
          <button
            onClick={handleSaveToggle}
            disabled={isTogglingSave}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isSaved
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'text-gray-600 hover:bg-gray-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isSaved ? 'Unsave idea' : 'Save idea'}
          >
            <svg
              className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Comment Input */}
          {isAuthenticated ? (
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {user ? getUserInitials(user) : 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  />
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newComment.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600 text-sm mb-2">Please log in to comment</p>
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Login
              </button>
            </div>
          )}

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 text-sm mt-2">Loading comments...</p>
            </div>
          ) : displayedComments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-4">
              {displayedComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  ideaId={idea.id}
                  onReply={handleReply}
                />
              ))}

              {/* Load More Comments */}
              {hasMoreComments && !showAllComments && (
                <button
                  onClick={() => setShowAllComments(true)}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Load more comments ({topLevelComments.length - COMMENTS_TO_SHOW} more)
                </button>
              )}

              {showAllComments && hasMoreComments && (
                <button
                  onClick={() => setShowAllComments(false)}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-700 font-medium transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedPost;
