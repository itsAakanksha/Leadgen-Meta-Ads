/** Mirrors the API's response shapes (dates arrive as ISO strings). */

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PLATFORMS = ['fb', 'ig'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type LeadSummary = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  platform: string | null;
  isOrganic: boolean | null;
  formId: string | null;
  campaignName: string | null;
  metaCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadsPage = {
  data: LeadSummary[];
  page: number;
  limit: number;
  total: number;
};

export type LeadsQuery = {
  q?: string;
  status?: LeadStatus;
  platform?: Platform;
  page: number;
};

export type FieldDataItem = { name: string; values: string[] };
export type DisclaimerResponse = { checkbox_key: string; is_checked: boolean };

export type FieldChange = { from: string | null; to: string | null };

export type LeadActivity =
  | {
      id: string;
      type: 'LEAD_CREATED';
      actor: string;
      payload: Record<string, never>;
      createdAt: string;
    }
  | {
      id: string;
      type: 'STATUS_CHANGED';
      actor: string;
      payload: { from: LeadStatus; to: LeadStatus };
      createdAt: string;
    }
  | {
      id: string;
      type: 'LEAD_UPDATED';
      actor: string;
      payload: { changes: Partial<Record<EditableField, FieldChange>> };
      createdAt: string;
    };

export const EDITABLE_FIELDS = ['fullName', 'email', 'phone', 'notes', 'assignee'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

export type LeadDetail = LeadSummary & {
  leadgenId: string;
  pageId: string | null;
  fieldData: FieldDataItem[];
  customDisclaimerResponses: DisclaimerResponse[];
  adId: string | null;
  adName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  campaignId: string | null;
  notes: string | null;
  assignee: string | null;
  version: number;
  allowedTransitions: LeadStatus[];
  activities: LeadActivity[];
};
