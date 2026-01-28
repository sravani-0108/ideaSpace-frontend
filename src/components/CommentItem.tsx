import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getUserDisplayName } from '../utils/user.util';

interface CommentItemProps {
  comment: Comment;
  ideaId: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  level?: number;
}

const CommentItem = ({ comment, ideaId, onReply, level = 0 }: CommentItemProps) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const author = comment.user || comment.author;
  const authorName = getUserDisplayName(author);
  const replies = comment.replies || [];

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : ''}`}>
      <div className={`${level > 0 ? 'border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1">
            <span className="font-medium text-gray-900 text-sm">{authorName}</span>
            {comment.parent && (
              <span className="text-xs text-gray-500 ml-2">
                replying to {getUserDisplayName(comment.parent.user || comment.parent.author)}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>
        
        <div className="flex items-center space-x-3 mb-2">
          {replies.length > 0 && (
            <span className="text-xs text-gray-500">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
          )}
          {isAuthenticated && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login');
                  return;
                }
                setIsReplying(!isReplying);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>

        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-2 mb-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
            />
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={isSubmitting || !replyContent.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
                className="px-3 py-1 text-gray-600 hover:text-gray-700 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Render nested replies */}
        {replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                ideaId={ideaId}
                onReply={onReply}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;

