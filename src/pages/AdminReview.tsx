import { useEffect, useState } from 'react';
import { adminService } from '../services/admin.service';
import { Idea } from '../types';
import { getUserDisplayName } from '../utils/user.util';

const AdminReview = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getIdeasForReview();
      setIdeas(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ideas for review');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await adminService.approveIdea(id);
      setIdeas(ideas.filter((idea) => idea.id !== id));
      // Show success message
      setError(''); // Clear any previous errors
      // You could add a success state here if needed
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to approve idea');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await adminService.rejectIdea(id);
      setIdeas(ideas.filter((idea) => idea.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject idea');
    } finally {
      setProcessingId(null);
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
          <p className="mt-4 text-gray-600">Loading ideas for review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Review</h1>
          <p className="mt-2 text-gray-600">Review and approve or reject submitted ideas</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {ideas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg">No ideas pending review. Great job!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {ideas.map((idea) => (
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
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                  <button
                    onClick={() => handleReject(idea.id)}
                    disabled={processingId === idea.id}
                    className="px-6 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === idea.id ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleApprove(idea.id)}
                    disabled={processingId === idea.id}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === idea.id ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReview;

