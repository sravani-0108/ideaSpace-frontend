import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { getUserInitials, getProfilePictureUrl } from '../utils/user.util';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
      });
      // Set profile picture preview if exists
      const pictureUrl = getProfilePictureUrl(user);
      setProfilePicturePreview(pictureUrl);
      setImageError(false); // Reset error state when user changes
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please select an image file');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size must be less than 5MB');
        return;
      }

      setProfilePicture(file);
      setMessage(''); // Clear any previous messages
      setImageError(false); // Reset error state
      
      // Create preview using URL.createObjectURL (more reliable and faster)
      const objectUrl = URL.createObjectURL(file);
      setProfilePicturePreview(objectUrl);
    } else {
      // Reset if no file selected
      setProfilePicture(null);
      setProfilePicturePreview(null);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const updatedUser = await userService.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      }, profilePicture || undefined);

      // Update auth context with new user data
      updateUser(updatedUser);

      setMessage('Profile updated successfully!');
      setIsEditing(false);
      
      // Clean up object URL if it exists
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
      
      setProfilePicture(null);
      
      // Update preview with the new profile picture from server
      if (updatedUser.profilePicture) {
        const pictureUrl = getProfilePictureUrl(updatedUser);
        // Add timestamp to force refresh
        const pictureUrlWithCacheBust = pictureUrl ? `${pictureUrl}?t=${Date.now()}` : null;
        setProfilePicturePreview(pictureUrlWithCacheBust);
        setImageError(false); // Reset error state for new image
      } else {
        setProfilePicturePreview(null);
        setImageError(false);
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
      });
      const pictureUrl = getProfilePictureUrl(user);
      setProfilePicturePreview(pictureUrl);
    }
    setErrors({});
    setMessage('');
    setIsEditing(false);
    setImageError(false);
    // Clean up object URL if it exists
    if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePicturePreview);
    }
    setProfilePicture(null);
    setProfilePicturePreview(getProfilePictureUrl(user));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="mt-2 text-gray-600">Manage your profile information</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Update</span>
              </button>
            )}
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`mb-6 rounded-md p-4 text-sm ${
                message.includes('successfully')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {/* Profile Content */}
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6 pb-8 border-b border-gray-200">
              <div className="relative">
                {(() => {
                  // Priority: preview (when editing) > user profile picture > initials
                  const imageUrl = profilePicturePreview || getProfilePictureUrl(user);
                  const shouldShowImage = imageUrl && !imageError;
                  
                  if (shouldShowImage) {
                    return (
                      <div className="w-24 h-24 rounded-full shadow-lg ring-4 ring-blue-100 overflow-hidden bg-gray-200">
                        <img 
                          key={imageUrl}
                          src={imageUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                          onLoad={() => {
                            setImageError(false);
                          }}
                          onError={() => {
                            setImageError(true);
                          }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-blue-100">
                      {getUserInitials(user)}
                    </div>
                  );
                })()}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 shadow-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </h2>
                <p className="text-gray-600 mt-1.5 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.email}
                </p>
                <span className="inline-flex items-center mt-3 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                  <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {user.role}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Name Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                          errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                        placeholder="Enter your first name"
                      />
                      {errors.firstName && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.firstName}</p>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-2.5 text-gray-900 bg-gray-50 rounded-lg border border-gray-200">
                      {user.firstName || 'Not set'}
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                          errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                        placeholder="Enter your last name"
                      />
                      {errors.lastName && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.lastName}</p>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-2.5 text-gray-900 bg-gray-50 rounded-lg border border-gray-200">
                      {user.lastName || 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              {/* Email and Role Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email (Read-only) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="px-4 py-2.5 text-gray-600 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{user.email}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Email cannot be changed
                  </p>
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <div className="px-4 py-2.5 text-gray-600 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end space-x-4 pt-8 border-t border-gray-200 mt-8">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm hover:shadow"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

