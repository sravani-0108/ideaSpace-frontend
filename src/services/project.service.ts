import api from './api';
import { Project } from '../types';

export interface SubmitProjectData {
  githubUrl?: string;
  demoVideoUrl?: string;
  documentationUrl?: string;
  projectDescription?: string;
  implementationDetails?: string;
  pitchVideoUrl?: string;
  presentationUrl?: string;
}

export interface ReviewProjectData {
  status: string;
  judgeFeedback?: string;
}

class ProjectService {
  async submitProject(ideaId: string, data: SubmitProjectData): Promise<Project> {
    const response = await api.post(`/projects/${ideaId}/submit`, data);
    return response.data.data;
  }

  async reviewProject(projectId: string, data: ReviewProjectData): Promise<Project> {
    const response = await api.put(`/projects/${projectId}/review`, data);
    return response.data.data;
  }

  async getProjectByIdeaId(ideaId: string): Promise<Project | null> {
    try {
      const response = await api.get(`/projects/idea/${ideaId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getProjectsByHackathon(hackathonId: string): Promise<Project[]> {
    const response = await api.get(`/projects/hackathon/${hackathonId}`);
    return response.data.data;
  }

  async getAllProjects(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data.data;
  }

  async getProjectById(projectId: string): Promise<Project> {
    const response = await api.get(`/projects/${projectId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch project');
    }
    return response.data.data;
  }

  async getProjectsNeedingReview(): Promise<Project[]> {
    const response = await api.get('/projects/review/pending');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch projects');
    }
    return response.data.data;
  }
}

export const projectService = new ProjectService();

