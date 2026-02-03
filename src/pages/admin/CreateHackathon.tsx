import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { HackathonType, HackathonStatus } from '../../types';
import AdminSidebar from '../../components/AdminSidebar';

const CreateHackathon = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    hackathonType: HackathonType.LEARNING,
    registrationStartDate: '',
    registrationEndDate: '',
    submissionDeadline: '',
    location: '',
    onlineLink: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = 'Purpose must be at least 10 characters long';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.registrationDeadline && new Date(formData.registrationDeadline) > new Date(formData.startDate)) {
      newErrors.registrationDeadline = 'Register by date must be before start date';
    }

    // Validate Hands-On hackathon fields
    if (formData.hackathonType === HackathonType.HANDS_ON) {
      if (!formData.submissionDeadline) {
        newErrors.submissionDeadline = 'Submission deadline is required for Hands-On hackathons';
      } else if (formData.startDate && new Date(formData.submissionDeadline) > new Date(formData.startDate)) {
        newErrors.submissionDeadline = 'Submission deadline must be before hackathon start date';
      }
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
      await hackathonService.createHackathon({
        title: formData.title.trim(),
        purpose: formData.purpose.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationDeadline: formData.hackathonType === HackathonType.LEARNING 
          ? (formData.registrationDeadline || undefined) 
          : (formData.hackathonType === HackathonType.HANDS_ON ? formData.submissionDeadline : undefined),
        hackathonType: formData.hackathonType,
        location: formData.location.trim(),
        onlineLink: formData.onlineLink.trim() || undefined,
        status: formData.hackathonType === HackathonType.HANDS_ON ? HackathonStatus.DRAFT : undefined, // Set DRAFT for Hands-On hackathons
      });
      setMessage('Hackathon created successfully!');
      setTimeout(() => {
        navigate('/admin/hackathons');
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to create hackathon. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Hackathon</h1>
            <p className="mt-2 text-gray-600">Organize a new hackathon event</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {message && (
              <div className={`mb-4 rounded-md p-3 text-sm ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter hackathon title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose *
                </label>
                <textarea
                  id="purpose"
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Brief purpose and goals of this hackathon"
                />
                {errors.purpose && <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Detailed description of the hackathon"
                />
              </div>

              <div>
                <label htmlFor="hackathonType" className="block text-sm font-medium text-gray-700 mb-2">
                  Hackathon Type *
                </label>
                <select
                  id="hackathonType"
                  value={formData.hackathonType}
                  onChange={(e) => setFormData({ ...formData, hackathonType: e.target.value as HackathonType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={HackathonType.LEARNING}>Learning</option>
                  <option value={HackathonType.HANDS_ON}>Hands-On</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Hands-On hackathons require idea submission and project implementation
                </p>
              </div>

              {formData.hackathonType === HackathonType.HANDS_ON && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label htmlFor="submissionDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                      Submission Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      id="submissionDeadline"
                      value={formData.submissionDeadline}
                      onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.submissionDeadline && <p className="mt-1 text-sm text-red-600">{errors.submissionDeadline}</p>}
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Users can submit ideas before this deadline. Ideas will be visible only to Admin/Judge until the deadline.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
                </div>

                {formData.hackathonType === HackathonType.LEARNING && (
                  <div>
                    <label htmlFor="registrationDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                      Register By
                    </label>
                    <input
                      type="datetime-local"
                      id="registrationDeadline"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.registrationDeadline && <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter location (e.g., Building A, Room 101)"
                />
                {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
              </div>

              <div>
                <label htmlFor="onlineLink" className="block text-sm font-medium text-gray-700 mb-2">
                  Online Event Link (Optional)
                </label>
                <input
                  type="url"
                  id="onlineLink"
                  value={formData.onlineLink}
                  onChange={(e) => setFormData({ ...formData, onlineLink: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Link for online/virtual hackathon events (Zoom, Teams, Google Meet, etc.)
                </p>
              </div>

              <div className="flex items-center justify-center space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/hackathons')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Hackathon'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateHackathon;

