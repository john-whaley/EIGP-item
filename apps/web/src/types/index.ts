export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string | null;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
  expiresInMinutes?: number;
  debugCode?: string;
}

export interface ActionResponse {
  success: boolean;
  message?: string;
}

export interface EmailSummary {
  id: string;
  email: string;
}

export interface RecoveryEmail {
  id: string;
  email: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  associatedEmails: EmailSummary[];
  associationCount: number;
}

export interface PhoneSummary {
  id: string;
  countryCode: string;
  phone: string;
  label: string;
  note?: string | null;
}

export interface RegisterPhone extends PhoneSummary {
  createdAt: string;
  updatedAt: string;
  associatedEmails: EmailSummary[];
  associationCount: number;
}

export interface RecoveryPhone extends PhoneSummary {
  createdAt: string;
  updatedAt: string;
  associatedEmails: EmailSummary[];
  associationCount: number;
}

export interface Platform {
  id: string;
  name: string;
  type: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  associatedEmails: EmailSummary[];
  associationCount: number;
}

export interface PrimaryEmail {
  id: string;
  email: string;
  password: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  registerPhones: PhoneSummary[];
  recoveryEmails: Array<Pick<RecoveryEmail, 'id' | 'email' | 'note'>>;
  recoveryPhones: PhoneSummary[];
  platforms: Array<Pick<Platform, 'id' | 'name' | 'type' | 'note'>>;
  relationshipCount: number;
}

export interface DashboardStatBlock {
  primaryEmailCount: number;
  recoveryEmailCount: number;
  registerPhoneCount: number;
  recoveryPhoneCount: number;
  platformCount: number;
  relationshipCount: number;
}

export interface DashboardRecentEmail {
  id: string;
  email: string;
  note?: string | null;
  updatedAt: string;
  createdAt: string;
  relationshipCount: number;
}

export interface DashboardUpdateItem {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  updatedAt: string;
}

export interface DashboardRelationshipItem {
  id: string;
  type: string;
  sourceLabel: string;
  targetLabel: string;
  createdAt: string;
}

export interface DistributionItem {
  name: string;
  type?: string;
  count: number;
}

export interface TopConnectedEmail {
  id: string;
  email: string;
  count: number;
}

export interface DashboardOverview {
  stats: DashboardStatBlock;
  recentPrimaryEmails: DashboardRecentEmail[];
  recentUpdates: DashboardUpdateItem[];
  recentRelationships: DashboardRelationshipItem[];
  entityDistribution: DistributionItem[];
  platformDistribution: DistributionItem[];
  topConnectedEmails: TopConnectedEmail[];
}

export interface SearchGroupItem {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  note?: string | null;
  updatedAt: string;
  related: string[];
  password?: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  count: number;
  items: SearchGroupItem[];
}

export interface SearchResponse {
  query: string;
  totals: {
    all: number;
    primaryEmails: number;
    recoveryEmails: number;
    registerPhones: number;
    recoveryPhones: number;
    platforms: number;
  };
  groups: SearchGroup[];
}

export interface GraphNode {
  id: string;
  entityId: string;
  type: 'primaryEmail' | 'recoveryEmail' | 'registerPhone' | 'recoveryPhone' | 'platform';
  label: string;
  subtitle: string;
  note?: string | null;
  detail: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'platform' | 'recoveryEmail' | 'registerPhone' | 'recoveryPhone';
  label: string;
}

export interface GraphResponse {
  summary: {
    primaryEmails: number;
    recoveryEmails: number;
    registerPhones: number;
    recoveryPhones: number;
    platforms: number;
    relationships: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}
