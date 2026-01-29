import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ideaService } from '../services/idea.service';
import { useNotifications } from '../contexts/NotificationContext';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../utils/user.util';

interface CreateIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateIdeaModal = ({ isOpen, onClose, onSuccess }: CreateIdeaModalProps) => {
  const { user } = useAuth();
  const { refreshCount } = useNotifications();
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must not exceed 255 characters';
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
      setMessage('Idea created successfully! It will be reviewed by an admin.');
      setFormData({ title: '', description: '' });
      setErrors({});
      refreshCount();
      setTimeout(() => {
        onSuccess();
        handleClose();
        setMessage('');
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to create idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ title: '', description: '' });
      setErrors({});
      setMessage('');
      onClose();
    }
  };

  const isFormValid = formData.title.trim().length >= 3 && formData.description.trim().length >= 10;

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1">
            {(() => {
              const profilePicUrl = getProfilePictureUrl(user);
              return profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={getUserDisplayName(user)}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0';
                    fallback.textContent = getUserInitials(user);
                    target.parentNode?.appendChild(fallback);
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {getUserInitials(user)}
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">{getUserDisplayName(user)}</h3>
              {/* <div className="flex items-center space-x-1 text-xs text-gray-500">
                <span>Post to Anyone</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div> */}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {message && (
              <div className={`mb-4 rounded-md p-3 text-sm ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {/* Title Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Add a title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-0 py-2 text-xl font-semibold border-none focus:outline-none placeholder-gray-400"
                maxLength={255}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Description Textarea */}
            <div className="mb-4">
              <textarea
                ref={textareaRef}
                placeholder="What do you want to talk about?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-0 py-2 text-base border-none focus:outline-none resize-none placeholder-gray-400 min-h-[200px]"
                rows={8}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>

          {/* Footer - Action Bar */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              {/* Left side - Action icons */}
              {/* <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Add emoji"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Add media"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="More options"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div> */}

              {/* Right side - Post button */}
              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`px-6 py-2 rounded-full font-semibold text-sm transition-colors ${
                    isFormValid && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIdeaModal;

