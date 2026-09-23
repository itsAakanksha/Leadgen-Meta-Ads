/** One answer from a Meta lead form: `field_data[]` item. */
export type FieldDataItem = { name: string; values: string[] };

/** One custom disclaimer checkbox response. */
export type DisclaimerResponse = { checkbox_key: string; is_checked: boolean };

/** Everything needed to create a lead from a Meta leadgen event. */
export type CreateLeadInput = {
  leadgenId: string;
  pageId: string | null;
  formId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  fieldData: FieldDataItem[];
  customDisclaimerResponses: DisclaimerResponse[];
  platform: string | null;
  isOrganic: boolean | null;
  adId: string | null;
  adName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  /** Full Graph response, kept because Meta deletes leads after 90 days. */
  graphResponse: Record<string, unknown>;
  metaCreatedAt: Date | null;
};
