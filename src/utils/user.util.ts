import { User } from '../types';

interface PartialUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string | null;
}

/**
 * Get user's display name (firstName + lastName) or fallback to email
 */
export const getUserDisplayName = (user?: User | PartialUser | null): string => {
  if (!user || !user.email) return 'Unknown';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.firstName) {
    return user.firstName;
  }
  
  return user.email;
};

/**
 * Get user's initials for avatar
 */
export const getUserInitials = (user?: User | PartialUser | null): string => {
  if (!user || !user.email) return 'U';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }
  
  if (user.firstName) {
    return user.firstName.charAt(0).toUpperCase();
  }
  
  return user.email.charAt(0).toUpperCase();
};

/**
 * Get user's profile picture URL
 */
export const getProfilePictureUrl = (user?: User | PartialUser | null): string | null => {
  if (!user?.profilePicture) return null;
  
  const picturePath = user.profilePicture;
  
  // If already a full URL, return as is
  if (picturePath.startsWith('http')) return picturePath;
  
  // If blob URL (for previews), return as is
  if (picturePath.startsWith('blob:')) return picturePath;
  
  // Backend returns path like /api/uploads/profile-pictures/filename.jpg
  // Construct full URL: http://localhost:5000 + /api/uploads/...
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = API_BASE_URL.replace('/api', ''); // Remove /api to get base URL
  
  // If path already starts with /api/, use it directly
  if (picturePath.startsWith('/api/')) {
    return `${baseUrl}${picturePath}`;
  }
  
  // If it's just a filename, construct the full path
  return `${baseUrl}/api/uploads/profile-pictures/${picturePath}`;
};

