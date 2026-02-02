import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { adminService } from '../../services/admin.service';
import { Idea, IdeaStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const IdeaReview = () => {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [projectDeadline, setProjectDeadline] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (ideaId) {
      loadIdea();
    }
  }, [ideaId]);

  const loadIdea = async () => {
    if (!ideaId) return;
    try {
      setIsLoading(true);
      const data = await ideaService.getIdeaById(ideaId);
      setIdea(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load idea');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!ideaId) return;
    
    setIsSubmitting(true);
    setMessage('');
    try {
      await adminService.approveIdea(ideaId, {
        projectDeadline: projectDeadline || undefined,
      });
      setMessage('Idea approved successfully!');
      setTimeout(() => {
        navigate('/judge/dashboard');
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to approve idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!ideaId) return;
    
    if (!rejectionReason.trim()) {
      setMessage('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      await adminService.rejectIdea(ideaId, {
        rejectionReason: rejectionReason.trim(),
      });
      setMessage('Idea rejected successfully!');
      setTimeout(() => {
        navigate('/judge/dashboard');
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to reject idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Idea not found</p>
          <button
            onClick={() => navigate('/judge/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const author = idea.user || idea.author;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/judge/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Review Idea</h1>
        </div>

        {message && (
          <div className={`mb-4 rounded-md p-3 text-sm ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              idea.status === IdeaStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
              idea.status === IdeaStatus.APPROVED ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {idea.status}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{idea.title}</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Submitted by</p>
            <p className="font-medium text-gray-900">
              {author?.firstName && author?.lastName 
                ? `${author.firstName} ${author.lastName}`
                : author?.email || 'Unknown'}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{idea.description}</p>
          </div>

          {idea.hackathon && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800">Hackathon</p>
              <p className="text-blue-900">{idea.hackathon.title}</p>
            </div>
          )}

          {idea.status === IdeaStatus.PENDING && (
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => setAction(action === 'approve' ? null : 'approve')}
                    className={`w-full px-4 py-2 rounded-md font-medium ${
                      action === 'approve'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}
                  >
                    {action === 'approve' ? '✓ Approve Idea' : 'Approve Idea'}
                  </button>
                  
                  {action === 'approve' && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Deadline (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={projectDeadline}
                        onChange={(e) => setProjectDeadline(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="mt-2 text-xs text-gray-600">
                        Set a deadline for project submission. If not set, participants can submit anytime after approval.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setAction(action === 'reject' ? null : 'reject')}
                    className={`w-full px-4 py-2 rounded-md font-medium ${
                      action === 'reject'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {action === 'reject' ? '✗ Reject Idea' : 'Reject Idea'}
                  </button>
                  
                  {action === 'reject' && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason *
                      </label>
                      <textarea
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        placeholder="Please provide a reason for rejection..."
                      />
                    </div>
                  )}
                </div>

                {(action === 'approve' || action === 'reject') && (
                  <div className="flex items-center space-x-4 pt-4">
                    <button
                      onClick={() => {
                        setAction(null);
                        setProjectDeadline('');
                        setRejectionReason('');
                        setMessage('');
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={action === 'approve' ? handleApprove : handleReject}
                      disabled={isSubmitting || (action === 'reject' && !rejectionReason.trim())}
                      className={`px-6 py-2 rounded-md text-sm font-medium text-white ${
                        action === 'approve'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default IdeaReview;

