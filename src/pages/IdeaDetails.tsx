import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ideaService } from '../services/idea.service';
import { commentService } from '../services/comment.service';
import { likeService } from '../services/like.service';
import { Idea, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommentItem from '../components/CommentItem';
import { getUserDisplayName } from '../utils/user.util';

interface IdeaWithLikes extends Idea {
  comments?: Comment[];
  likes?: Array<{ userId: string }>;
}

const IdeaDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { refreshCount } = useNotifications();
  const [idea, setIdea] = useState<IdeaWithLikes | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadIdea();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const loadIdea = async () => {
    try {
      setIsLoading(true);
      const data = await ideaService.getIdeaById(id!) as IdeaWithLikes;
      // Check if current user has liked this idea
      const isLiked = user && data.likes?.some((like) => like.userId === user.id);
      setIdea({ ...data, isLiked: !!isLiked });
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
            onClick={() => navigate('/')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
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
          onClick={() => navigate('/')}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{idea.title}</h1>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">{idea.description}</p>
          
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>By {getUserDisplayName(idea.user || idea.author)}</span>
              <span>{formatDate(idea.createdAt)}</span>
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

