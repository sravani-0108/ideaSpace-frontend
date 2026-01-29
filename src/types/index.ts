export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum IdeaStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

export enum NotificationType {
  COMMENT = 'COMMENT',
  LIKE = 'LIKE',
  HACKATHON_REMINDER = 'HACKATHON_REMINDER',
  HACKATHON_REGISTRATION = 'HACKATHON_REGISTRATION',
  IDEA_APPROVED = 'IDEA_APPROVED',
  IDEA_REJECTED = 'IDEA_REJECTED'
}

export enum HackathonStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

export interface Hackathon {
  id: string;
  title: string;
  purpose: string;
  description?: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  location: string;
  onlineLink?: string;
  status: HackathonStatus;
  createdBy: string;
  creator?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HackathonRegistration {
  id: string;
  hackathonId: string;
  userId: string;
  teamId?: string;
  hackathon?: Hackathon;
  user?: User;
  team?: Team;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  hackathonId: string;
  createdBy: string;
  hackathon?: Hackathon;
  creator?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  meetingLink?: string;
  hackathonId: string;
  teamId?: string;
  createdBy: string;
  hackathon?: Hackathon;
  team?: Team;
  creator?: User;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isEmailVerified: boolean;
  profilePicture?: string | null;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  author?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  parentId?: string;
  author?: {
    id: string;
    email: string;
  };
  user?: {
    id: string;
    email: string;
  };
  parent?: Comment;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  ideaId?: string;
  hackathonId?: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  idea?: {
    id: string;
    title: string;
  };
  hackathon?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    location: string;
  };
}

export interface AuthResponse {
  token: string;
  user: User & {
    profilePicture?: string | null;
    isEmailVerified: boolean;
  };
}
