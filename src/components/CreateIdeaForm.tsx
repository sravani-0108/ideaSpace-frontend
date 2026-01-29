import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserInitials, getProfilePictureUrl } from '../utils/user.util';
import CreateIdeaModal from './CreateIdeaModal';

interface CreateIdeaFormProps {
  onSuccess: () => void;
}

const CreateIdeaForm = ({ onSuccess }: CreateIdeaFormProps) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profilePicture]);

  if (!user) return null;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
        >
          {(() => {
            const profilePicUrl = getProfilePictureUrl(user);
            const shouldShowImage = profilePicUrl && !imageError;
            
            if (shouldShowImage) {
              return (
                <img
                  key={`create-form-${user.id}-${user.profilePicture || 'no-pic'}`}
                  src={profilePicUrl}
                  alt={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  onError={() => {
                    setImageError(true);
                  }}
                  onLoad={() => {
                    setImageError(false);
                  }}
                />
              );
            }
            
            return (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                {getUserInitials(user)}
              </div>
            );
          })()}
          <div className="flex-1 text-gray-500 text-sm">
            Start a post...
          </div>
        </div>
      </div>

      <CreateIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default CreateIdeaForm;

