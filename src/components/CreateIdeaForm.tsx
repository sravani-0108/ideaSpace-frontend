import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserInitials } from '../utils/user.util';
import CreateIdeaModal from './CreateIdeaModal';

interface CreateIdeaFormProps {
  onSuccess: () => void;
}

const CreateIdeaForm = ({ onSuccess }: CreateIdeaFormProps) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
            {getUserInitials(user)}
          </div>
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

