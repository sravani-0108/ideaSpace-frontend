import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ideaService } from '../../services/idea.service';
import { getUserInitials } from '../../utils/user.util';
import AdminSidebar from '../../components/AdminSidebar';

const CreateIdea = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await ideaService.createIdea({
        title: formData.title.trim(),
        description: formData.description.trim(),
      });
      
      setMessage('Idea created and published successfully!');
      setFormData({ title: '', description: '' });
      setIsExpanded(false);
      setTimeout(() => {
        navigate('/admin/ideas');
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to create idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Idea</h1>
            <p className="mt-2 text-gray-600">Post an idea that will be automatically published</p>
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

          {/* LinkedIn-style Post Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <form onSubmit={handleSubmit}>
              {/* User Info and Input Row */}
              <div className="flex items-start space-x-3 mb-3">
                {/* Profile Picture */}
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {getUserInitials(user)}
                </div>

                {/* Input Field */}
                <div className="flex-1">
                  {!isExpanded ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      onFocus={handleInputFocus}
                      className="w-full px-4 py-3 bg-blue-50 border border-gray-200 rounded-full text-gray-700 placeholder-gray-500 focus:outline-none focus:bg-white focus:border-gray-400 transition-colors"
                      placeholder="Start a post"
                      disabled={isLoading}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Title Input */}
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.title ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Title your idea..."
                        disabled={isLoading}
                      />
                      {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}

                      {/* Description Textarea */}
                      <textarea
                        ref={textareaRef}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                          errors.description ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Share your thoughts, details, and vision..."
                        rows={6}
                        disabled={isLoading}
                      />
                      {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2">

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsExpanded(false);
                              setFormData({ title: '', description: '' });
                              setErrors({});
                            }}
                            disabled={isLoading}
                            className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !formData.title.trim() || !formData.description.trim()}
                            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? 'Publishing...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateIdea;

