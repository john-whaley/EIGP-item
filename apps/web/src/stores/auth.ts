import { defineStore } from 'pinia';
import { authApi } from '@/api/services';
import type { User } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('eigp_token'),
    user: JSON.parse(localStorage.getItem('eigp_user') || 'null')
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token)
  },
  actions: {
    restoreSession() {
      this.token = localStorage.getItem('eigp_token');
      this.user = JSON.parse(localStorage.getItem('eigp_user') || 'null');
    },
    async sendRegisterCode(email: string) {
      return authApi.sendRegisterCode({ email });
    },
    async sendLoginCode(email: string) {
      return authApi.sendLoginCode({ email });
    },
    async sendPasswordResetCode(email: string) {
      return authApi.sendPasswordResetCode({ email });
    },
    async register(payload: {
      email: string;
      code: string;
      password: string;
      nickname?: string;
    }) {
      const data = await authApi.register(payload);
      this.setSession(data.accessToken, data.user);
      return data;
    },
    async login(payload: { email: string; password: string }) {
      const data = await authApi.login(payload);
      this.setSession(data.accessToken, data.user);
      return data;
    },
    async loginWithCode(payload: { email: string; code: string }) {
      const data = await authApi.loginWithCode(payload);
      this.setSession(data.accessToken, data.user);
      return data;
    },
    async resetPassword(payload: { email: string; code: string; password: string }) {
      return authApi.resetPassword(payload);
    },
    async changePassword(payload: { currentPassword: string; newPassword: string }) {
      return authApi.changePassword(payload);
    },
    async fetchProfile() {
      if (!this.token) {
        return null;
      }

      const profile = await authApi.profile();
      this.user = profile;
      localStorage.setItem('eigp_user', JSON.stringify(profile));
      return profile;
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('eigp_token');
      localStorage.removeItem('eigp_user');
    },
    setSession(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem('eigp_token', token);
      localStorage.setItem('eigp_user', JSON.stringify(user));
    }
  }
});
