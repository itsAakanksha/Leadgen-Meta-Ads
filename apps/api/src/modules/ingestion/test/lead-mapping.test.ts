import { describe, expect, it } from 'vitest';

import { InvalidGraphLeadError, mapGraphLead } from '../lead-mapping.js';

const event = { leadgen_id: '900', page_id: '100', form_id: '200', ad_id: '300' };

// Shape documented in Meta's "Retrieving Leads" guide.
const graphLead = {
  id: '900',
  created_time: '2026-09-24T10:15:00+0000',
  form_id: '200',
  field_data: [
    { name: 'full_name', values: ['  Ada Lovelace '] },
    { name: 'email', values: ['ada@example.com'] },
    { name: 'phone_number', values: ['+447700900123'] },
    { name: 'what_is_your_budget?', values: ['10k-50k'] },
  ],
  custom_disclaimer_responses: [{ checkbox_key: 'marketing_opt_in', is_checked: '1' }],
  platform: 'ig',
  is_organic: false,
  ad_id: '300',
  ad_name: 'Autumn promo',
  adset_id: '310',
  adset_name: 'UK 25-40',
  campaign_id: '320',
  campaign_name: 'Autumn',
};

describe('mapGraphLead', () => {
  it('maps standard questions, attribution and consents', () => {
    const lead = mapGraphLead(graphLead, event);

    expect(lead).toMatchObject({
      leadgenId: '900',
      pageId: '100',
      formId: '200',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+447700900123',
      platform: 'ig',
      isOrganic: false,
      adId: '300',
      adName: 'Autumn promo',
      adsetId: '310',
      adsetName: 'UK 25-40',
      campaignId: '320',
      campaignName: 'Autumn',
      customDisclaimerResponses: [{ checkbox_key: 'marketing_opt_in', is_checked: true }],
    });
    expect(lead.metaCreatedAt?.toISOString()).toBe('2026-09-24T10:15:00.000Z');
  });

  it('keeps every answer, including custom questions, in fieldData', () => {
    const lead = mapGraphLead(graphLead, event);
    expect(lead.fieldData).toContainEqual({ name: 'what_is_your_budget?', values: ['10k-50k'] });
    expect(lead.fieldData).toHaveLength(4);
  });

  it('keeps the full Graph response untouched', () => {
    const response = { ...graphLead, some_future_field: 'x' };
    expect(mapGraphLead(response, event).graphResponse).toBe(response);
  });

  it('builds the name from first_name and last_name when full_name is absent', () => {
    const lead = mapGraphLead(
      {
        id: '900',
        field_data: [
          { name: 'first_name', values: ['Grace'] },
          { name: 'last_name', values: ['Hopper'] },
        ],
      },
      event,
    );
    expect(lead.fullName).toBe('Grace Hopper');
  });

  it('uses null for missing or blank answers', () => {
    const lead = mapGraphLead(
      {
        id: '900',
        field_data: [
          { name: 'email', values: ['   '] },
          { name: 'phone_number', values: [] },
        ],
      },
      event,
    );
    expect(lead).toMatchObject({ fullName: null, email: null, phone: null });
  });

  it('handles organic/test leads that have no attribution fields', () => {
    const lead = mapGraphLead({ id: '900', field_data: [] }, { leadgen_id: '900' });
    expect(lead).toMatchObject({
      pageId: null,
      formId: null,
      adId: null,
      campaignName: null,
      platform: null,
      isOrganic: null,
      customDisclaimerResponses: [],
      metaCreatedAt: null,
    });
  });

  it('falls back to webhook IDs when Graph omits them', () => {
    const lead = mapGraphLead({ id: '900', field_data: [] }, event);
    expect(lead).toMatchObject({ formId: '200', adId: '300' });
  });

  it('accepts boolean is_checked as well as "1"/"0"', () => {
    const lead = mapGraphLead(
      {
        id: '900',
        custom_disclaimer_responses: [
          { checkbox_key: 'a', is_checked: true },
          { checkbox_key: 'b', is_checked: '0' },
        ],
      },
      event,
    );
    expect(lead.customDisclaimerResponses).toEqual([
      { checkbox_key: 'a', is_checked: true },
      { checkbox_key: 'b', is_checked: false },
    ]);
  });

  it('rejects a response that is not a lead', () => {
    expect(() => mapGraphLead({ error: 'nope' }, event)).toThrow(InvalidGraphLeadError);
    expect(() => mapGraphLead(null, event)).toThrow(InvalidGraphLeadError);
  });
});
