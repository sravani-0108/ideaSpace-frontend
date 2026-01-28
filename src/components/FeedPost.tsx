import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Idea } from '../types';
import { getUserDisplayName, getUserInitials } from '../utils/user.util';
import { useAuth } from '../contexts/AuthContext';
import { savedIdeaService } from '../services/savedIdea.service';

interface FeedPostProps {
  idea: Idea;
}

const FeedPost = ({ idea }: FeedPostProps) => {
  const { isAuthenticated } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkSavedStatus();
    }
  }, [idea.id, isAuthenticated]);

  const checkSavedStatus = async () => {
    try {
      const saved = await savedIdeaService.checkSavedStatus(idea.id);
      setIsSaved(saved);
    } catch (error) {
      // Silently fail - user might not be authenticated
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) return;

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

  return (
    <Link
      to={`/ideas/${idea.id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition-shadow block"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {authorInitial}
          </div>
          <h3 className="font-semibold text-gray-900">{authorName}</h3>
        </div>
        <div className="flex-shrink-0">
          <span className="text-gray-500 text-sm">{formatDate(idea.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{idea.title}</h2>
        <p className="text-gray-700 text-sm line-clamp-3">{idea.description}</p>
      </div>

      {/* Footer - Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm">{idea.likesCount}</span>
          </div>
          <div className="flex items-center text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">{idea.commentsCount}</span>
          </div>
        </div>
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
    </Link>
  );
};

export default FeedPost;

