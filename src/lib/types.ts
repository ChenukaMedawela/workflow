

export type UserRole = 'Super User' | 'Super Admin' | 'Admin' | 'Manager' | 'Viewer';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  entityId?: string;
  password?: string;
};

export type Entity = {
  id: string;
  name: string;
};

export type Stage = {
  id: string;
  name: string;
  order: number;
  isIsolated: boolean;
  rules: {
    requireStartDateToEnter: boolean;
    requireEndDateToLeave: boolean;
  };
};

export type StageHistoryEntry = {
    stageId: string;
    timestamp: string; // ISO string date
};

export type Lead = {
  id: string;
  accountName: string;
  stageId?: string;
  sector: string;
  ownerEntityId: string;
  contractType: 'Annual' | 'Monthly' | 'One-Time';
  contractStartDate: string; // ISO string date
  contractEndDate: string; // ISO string date
  amount: number;
  contractDuration?: number; // in months
  addedUserId: string;
  addedDate: string; // ISO string date
  stageHistory: StageHistoryEntry[];
};

export type LeadActivity = {
  id: string;
  leadId: string;
  userId: string;
  date: string; // ISO string date
  activity: string;
};

export type AutomationRule = {
    stageId: string;
    enabled: boolean;
    triggerDays: number;
    action: 'Move to Next Stage' | 'Move to Global Stage';
};

export type AuditLog = {
  id: string;
  user: {
    id: string;
    name: string;
    entityId?: string | null;
  };
  action: string;
  from?: any;
  to?: any;
  details?: Record<string, any>;
  timestamp: string; // ISO string date
};
