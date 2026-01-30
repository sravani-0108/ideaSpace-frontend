import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { ideaService } from '../../services/idea.service';
import { Idea } from '../../types';
import { getUserDisplayName, getUserInitials } from '../../utils/user.util';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import FeedPost from '../../components/FeedPost';
import EmptyFeed from '../../components/EmptyFeed';

type TaskView = 'post' | 'pending' | 'allPosts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TaskView | null;
  
  // Initialize taskView from URL param or default to 'post'
  const [taskView, setTaskView] = useState<TaskView>(() => {
    if (tabParam && ['post', 'pending', 'allPosts'].includes(tabParam)) {
      return tabParam as TaskView;
    }
    return 'post';
  });

  // Sync URL param when taskView changes
  useEffect(() => {
    if (taskView !== 'post' && tabParam !== taskView) {
      setSearchParams({ tab: taskView }, { replace: true });
    } else if (taskView === 'post' && tabParam) {
      setSearchParams({}, { replace: true });
    }
  }, [taskView, tabParam, setSearchParams]);
  const [pendingIdeas, setPendingIdeas] = useState<Idea[]>([]);
  const [allPosts, setAllPosts] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [postFormData, setPostFormData] = useState({ title: '', description: '' });
  const [postErrors, setPostErrors] = useState<Record<string, string>>({});
  const [isPosting, setIsPosting] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taskView !== 'post') {
      loadTasks();
    }
  }, [taskView]);


  const loadAllPosts = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await ideaService.getApprovedIdeas(); // Gets published ideas
      setAllPosts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load all posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (taskView === 'post' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [taskView]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (taskView === 'pending') {
        const data = await adminService.getIdeasForReview();
        // Debug: Log hackathon types
        console.log('📋 All pending ideas loaded:', data.map(idea => ({
          id: idea.id,
          title: idea.title.substring(0, 40),
          hackathonId: idea.hackathonId || 'NO HACKATHON ID',
          hasHackathonObject: !!idea.hackathon,
          hackathonType: idea.hackathon?.hackathonType || 'N/A',
          hackathonTitle: idea.hackathon?.title || 'N/A'
        })));
        setPendingIdeas(data);
      } else if (taskView === 'allPosts') {
        await loadAllPosts();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
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

  const validatePostForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!postFormData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (postFormData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (!postFormData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (postFormData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    setPostErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostMessage('');

    if (!validatePostForm()) {
      return;
    }

    setIsPosting(true);
    try {
      await ideaService.createIdea({
        title: postFormData.title.trim(),
        description: postFormData.description.trim(),
      });
      
      setPostMessage('Idea created and published successfully!');
      setPostFormData({ title: '', description: '' });
      setPostErrors({});
      // Reload tasks to show the new idea
      if (taskView !== 'post') {
        loadTasks();
      }
      setTimeout(() => {
        setPostMessage('');
      }, 3000);
    } catch (error: any) {
      setPostMessage(error.response?.data?.message || 'Failed to create idea. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostCancel = () => {
    setPostFormData({ title: '', description: '' });
    setPostErrors({});
    setPostMessage('');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            {/* <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Ideas</h1>
              <p className="mt-2 text-gray-600">Manage ideas and tasks</p>
            </div> */}
            
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setTaskView('post')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    taskView === 'post'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Post
                </button>
                <button
                  onClick={() => setTaskView('pending')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    taskView === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Tasks
                </button>
                <button
                  onClick={() => setTaskView('allPosts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    taskView === 'allPosts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Posts
                </button>
              </nav>
            </div>
          </div>

          {/* Post Form - LinkedIn Style */}
          {taskView === 'post' && (
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {postMessage && (
                <div className={`mb-4 rounded-md p-3 text-sm ${
                  postMessage.includes('successfully') 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  {postMessage}
                </div>
              )}
              <form onSubmit={handlePostSubmit}>
                <div className="flex items-start space-x-3 mb-3">
                  {/* Profile Picture */}
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {getUserInitials(user)}
                  </div>

                  {/* Form Fields */}
                  <div className="flex-1 space-y-4">
                    {/* Title Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={postFormData.title}
                      onChange={(e) => setPostFormData({ ...postFormData, title: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        postErrors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Title your idea..."
                      disabled={isPosting}
                    />
                    {postErrors.title && <p className="text-sm text-red-600">{postErrors.title}</p>}

                    {/* Description Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={postFormData.description}
                      onChange={(e) => setPostFormData({ ...postFormData, description: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        postErrors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Share your thoughts, details, and vision..."
                      rows={6}
                      disabled={isPosting}
                    />
                    {postErrors.description && <p className="text-sm text-red-600">{postErrors.description}</p>}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={handlePostCancel}
                        disabled={isPosting}
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPosting || !postFormData.title.trim() || !postFormData.description.trim()}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPosting ? 'Publishing...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tasks View - Pending */}
          {taskView === 'pending' && (
            <>
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {(() => {
                // Filter out hackathon ideas - only show regular ideas (no hackathonId)
                const regularIdeas = pendingIdeas.filter((idea) => !idea.hackathonId);

                return (
                  <>
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading pending tasks...</p>
                      </div>
                    ) : regularIdeas.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg shadow-md">
                        <p className="text-gray-500 text-lg">
                          No pending ideas tasks. Great job!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {regularIdeas.map((idea) => (
                    <div key={idea.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{idea.title}</h2>
                          <p className="text-gray-600 mb-4 whitespace-pre-wrap">{idea.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>By {getUserDisplayName(idea.user || idea.author)}</span>
                            <span>{formatDate(idea.createdAt)}</span>
                          </div>
                        </div>
                        <span className="ml-4 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {idea.status}
                        </span>
                      </div>
                      <div className="flex items-end justify-end space-x-4 pt-4 border-t">
                        <button
                          onClick={async () => {
                            try {
                              await adminService.rejectIdea(idea.id);
                              loadTasks();
                            } catch (err: any) {
                              setError(err.response?.data?.message || 'Failed to reject idea');
                            }
                          }}
                          className="px-6 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Reject
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await adminService.approveIdea(idea.id);
                              loadTasks();
                            } catch (err: any) {
                              setError(err.response?.data?.message || 'Failed to approve idea');
                            }
                          }}
                          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Approve
                        </button>
                      </div>
                        </div>
                      ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* All Posts View - Using FeedPost component */}
          {taskView === 'allPosts' && (
            <>
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              ) : allPosts.length === 0 ? (
                <EmptyFeed />
              ) : (
                <div className="space-y-4">
                  {allPosts.map((idea) => (
                    <FeedPost key={idea.id} idea={idea} />
                  ))}
                </div>
              )}
            </>
          )}


        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

