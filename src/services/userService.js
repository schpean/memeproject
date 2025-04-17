import apiService from './apiService';
import { API_ENDPOINTS } from '../utils/config';

const userService = {
  // Get current user's profile
  getCurrentUser: async () => {
    return apiService.get(API_ENDPOINTS.currentUser);
  },

  // Get user statistics (admin only)
  getUserStats: async (userId) => {
    return apiService.get(API_ENDPOINTS.userStats(userId));
  },

  // Update user's nickname
  updateNickname: async (nickname) => {
    return apiService.post(API_ENDPOINTS.updateNickname, { nickname });
  },

  // Get all users (admin only)
  getAllUsers: async () => {
    return apiService.get(API_ENDPOINTS.adminUsers);
  },

  // Get all roles (admin only)
  getAllRoles: async () => {
    return apiService.get(API_ENDPOINTS.adminRoles);
  },

  // Update user's role (admin only)
  updateUserRole: async (userId, roleId) => {
    return apiService.put(API_ENDPOINTS.updateUserRole(userId), { roleId });
  },

  // Delete/Anonymize user (admin only)
  deleteUser: async (userId) => {
    return apiService.delete(API_ENDPOINTS.deleteUser(userId));
  },

  // Get user's upvoted memes
  getUserUpvotes: async (userId) => {
    return apiService.get(API_ENDPOINTS.userUpvotes(userId));
  },

  // Verify email
  verifyEmail: async (token) => {
    return apiService.get(API_ENDPOINTS.buildUrl(API_ENDPOINTS.verifyEmail, { token }));
  },

  // Resend verification email
  resendVerification: async (email) => {
    return apiService.post(API_ENDPOINTS.resendVerification, { email });
  }
};

export default userService; 