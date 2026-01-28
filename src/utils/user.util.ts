import { User } from '../types';

interface PartialUser {
  firstName?: string;
  lastName?: string;
  email?: string;
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

