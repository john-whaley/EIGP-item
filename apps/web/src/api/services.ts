import http from './http';
import type {
  ActionResponse,
  AuthResponse,
  DashboardOverview,
  GraphResponse,
  Platform,
  PrimaryEmail,
  RecoveryEmail,
  RecoveryPhone,
  RegisterPhone,
  SearchResponse,
  SendCodeResponse,
  User
} from '@/types';

export const authApi = {
  sendRegisterCode(payload: { email: string }) {
    return http
      .post<SendCodeResponse>('/auth/register/send-code', payload)
      .then((response) => response.data);
  },
  register(payload: { email: string; code: string; password: string; nickname?: string }) {
    return http.post<AuthResponse>('/auth/register', payload).then((response) => response.data);
  },
  login(payload: { email: string; password: string }) {
    return http.post<AuthResponse>('/auth/login', payload).then((response) => response.data);
  },
  sendLoginCode(payload: { email: string }) {
    return http
      .post<SendCodeResponse>('/auth/login/send-code', payload)
      .then((response) => response.data);
  },
  loginWithCode(payload: { email: string; code: string }) {
    return http.post<AuthResponse>('/auth/login/code', payload).then((response) => response.data);
  },
  sendPasswordResetCode(payload: { email: string }) {
    return http
      .post<SendCodeResponse>('/auth/password/send-code', payload)
      .then((response) => response.data);
  },
  sendChangePasswordCode() {
    return http
      .post<SendCodeResponse>('/auth/password/change/send-code')
      .then((response) => response.data);
  },
  resetPassword(payload: { email: string; code: string; password: string }) {
    return http
      .post<ActionResponse>('/auth/password/reset', payload)
      .then((response) => response.data);
  },
  changePassword(payload: { code: string; newPassword: string }) {
    return http
      .post<ActionResponse>('/auth/password/change', payload)
      .then((response) => response.data);
  },
  profile() {
    return http.get<User>('/auth/profile').then((response) => response.data);
  }
};

export const emailsApi = {
  list(params?: { search?: string }) {
    return http.get<PrimaryEmail[]>('/emails', { params }).then((response) => response.data);
  },
  detail(id: string) {
    return http.get<PrimaryEmail>(`/emails/${id}`).then((response) => response.data);
  },
  create(payload: Record<string, unknown>) {
    return http.post<PrimaryEmail>('/emails', payload).then((response) => response.data);
  },
  update(id: string, payload: Record<string, unknown>) {
    return http.patch<PrimaryEmail>(`/emails/${id}`, payload).then((response) => response.data);
  },
  remove(id: string) {
    return http.delete<ActionResponse>(`/emails/${id}`).then((response) => response.data);
  }
};

export const recoveryEmailsApi = {
  list(params?: { search?: string }) {
    return http
      .get<RecoveryEmail[]>('/recovery-emails', { params })
      .then((response) => response.data);
  },
  create(payload: Record<string, unknown>) {
    return http.post<RecoveryEmail>('/recovery-emails', payload).then((response) => response.data);
  },
  update(id: string, payload: Record<string, unknown>) {
    return http
      .patch<RecoveryEmail>(`/recovery-emails/${id}`, payload)
      .then((response) => response.data);
  },
  remove(id: string) {
    return http
      .delete<ActionResponse>(`/recovery-emails/${id}`)
      .then((response) => response.data);
  }
};

export const registerPhonesApi = {
  list(params?: { search?: string }) {
    return http
      .get<RegisterPhone[]>('/register-phones', { params })
      .then((response) => response.data);
  },
  create(payload: Record<string, unknown>) {
    return http.post<RegisterPhone>('/register-phones', payload).then((response) => response.data);
  },
  update(id: string, payload: Record<string, unknown>) {
    return http
      .patch<RegisterPhone>(`/register-phones/${id}`, payload)
      .then((response) => response.data);
  },
  remove(id: string) {
    return http
      .delete<ActionResponse>(`/register-phones/${id}`)
      .then((response) => response.data);
  }
};

export const recoveryPhonesApi = {
  list(params?: { search?: string }) {
    return http
      .get<RecoveryPhone[]>('/recovery-phones', { params })
      .then((response) => response.data);
  },
  create(payload: Record<string, unknown>) {
    return http.post<RecoveryPhone>('/recovery-phones', payload).then((response) => response.data);
  },
  update(id: string, payload: Record<string, unknown>) {
    return http
      .patch<RecoveryPhone>(`/recovery-phones/${id}`, payload)
      .then((response) => response.data);
  },
  remove(id: string) {
    return http
      .delete<ActionResponse>(`/recovery-phones/${id}`)
      .then((response) => response.data);
  }
};

export const platformsApi = {
  list(params?: { search?: string }) {
    return http.get<Platform[]>('/platforms', { params }).then((response) => response.data);
  },
  create(payload: Record<string, unknown>) {
    return http.post<Platform>('/platforms', payload).then((response) => response.data);
  },
  update(id: string, payload: Record<string, unknown>) {
    return http.patch<Platform>(`/platforms/${id}`, payload).then((response) => response.data);
  },
  remove(id: string) {
    return http.delete<ActionResponse>(`/platforms/${id}`).then((response) => response.data);
  }
};

export const dashboardApi = {
  overview() {
    return http.get<DashboardOverview>('/dashboard/overview').then((response) => response.data);
  }
};

export const searchApi = {
  query(q: string) {
    return http.get<SearchResponse>('/search', { params: { q } }).then((response) => response.data);
  }
};

export const graphApi = {
  fetch() {
    return http.get<GraphResponse>('/graph').then((response) => response.data);
  }
};
