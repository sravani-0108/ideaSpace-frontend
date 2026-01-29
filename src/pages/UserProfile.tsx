import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/user.service';
import { ideaService } from '../services/idea.service';
import { commentService } from '../services/comment.service';
import { User, Idea, Comment } from '../types';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../utils/user.util';
import FeedPost from '../components/FeedPost';

type TabType = 'posts' | 'comments';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Idea[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && user) {
      if (activeTab === 'posts') {
        loadPosts();
      } else {
        loadComments();
      }
    }
  }, [userId, activeTab, user]);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError('');
      const userData = await userService.getUserById(userId!);
      setUser(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setIsLoadingPosts(true);
      const data = await ideaService.getIdeasByUserId(userId!);
      setPosts(data);
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const data = await commentService.getCommentsByUserId(userId!);
      setComments(data);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">User not found</p>
          <button
            onClick={() => navigate('/')}
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

  const userName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const profilePicUrl = getProfilePictureUrl(user);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
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

        {/* User Profile Header */}
        <div className="bg-white shadow-md rounded-lg p-8 mb-6">
          <div className="flex items-start space-x-6">
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt={userName}
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl';
                  fallback.textContent = userInitials;
                  target.parentNode?.appendChild(fallback);
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl">
                {userInitials}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{userName}</h1>
              <p className="text-gray-600 mb-4">{user.email}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow-md rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Posts ({posts.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'comments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comments ({comments.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'posts' && (
              <>
                {isLoadingPosts ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading posts...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((idea) => (
                      <FeedPost key={idea.id} idea={idea} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'comments' && (
              <>
                {isLoadingComments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start space-x-3 mb-2">
                          <div className="flex-1">
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                            {comment.idea && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">On post:</p>
                                <button
                                  onClick={() => navigate(`/ideas/${comment.idea?.id}`)}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                  {comment.idea.title}
                                </button>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

