import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../../lib/errors.js';
import { parseJsonKeepingIds, parseWebhookBody } from '../webhook-payload.js';

const parse = (text: string) => parseWebhookBody(Buffer.from(text));

describe('parseJsonKeepingIds', () => {
  it('keeps numeric IDs above 2^53 exactly, as strings', () => {
    const result = parseJsonKeepingIds(
      '{"leadgen_id": 12345678901234567890, "id": 9007199254740993}',
    );
    expect(result).toEqual({ leadgen_id: '12345678901234567890', id: '9007199254740993' });
  });

  it('leaves non-ID numbers as numbers', () => {
    expect(parseJsonKeepingIds('{"created_time": 1440120384, "time": 5}')).toEqual({
      created_time: 1440120384,
      time: 5,
    });
  });

  it('leaves string IDs unchanged', () => {
    expect(parseJsonKeepingIds('{"page_id": "123"}')).toEqual({ page_id: '123' });
  });
});

describe('parseWebhookBody', () => {
  it("parses Meta's documented example, where IDs are JSON numbers", () => {
    // Example payload from Meta's leadgen webhook docs.
    const events = parse(`{
      "object": "page",
      "entry": [{
        "id": 153125381133, "time": 1438292065,
        "changes": [{
          "field": "leadgen",
          "value": {
            "leadgen_id": 123123123123, "page_id": 123123123, "form_id": 12312312312,
            "adgroup_id": 12312312312, "ad_id": 12312312312, "created_time": 1440120384
          }
        }]
      }]
    }`);
    expect(events).toEqual([
      {
        leadgenId: '123123123123',
        payload: {
          leadgen_id: '123123123123',
          page_id: '123123123',
          form_id: '12312312312',
          adgroup_id: '12312312312',
          ad_id: '12312312312',
          created_time: 1440120384,
        },
      },
    ]);
  });

  it('returns every leadgen change across a batch of entries', () => {
    const events = parse(
      JSON.stringify({
        object: 'page',
        entry: [
          { changes: [{ field: 'leadgen', value: { leadgen_id: '1' } }] },
          {
            changes: [
              { field: 'leadgen', value: { leadgen_id: '2' } },
              { field: 'leadgen', value: { leadgen_id: '3' } },
            ],
          },
        ],
      }),
    );
    expect(events.map((e) => e.leadgenId)).toEqual(['1', '2', '3']);
  });

  it('ignores changes for other subscribed fields', () => {
    const events = parse(
      JSON.stringify({
        object: 'page',
        entry: [
          {
            changes: [
              { field: 'feed', value: { post_id: 'x' } },
              { field: 'leadgen', value: { leadgen_id: '1' } },
            ],
          },
        ],
      }),
    );
    expect(events.map((e) => e.leadgenId)).toEqual(['1']);
  });

  it('ignores non-page objects', () => {
    expect(parse(JSON.stringify({ object: 'instagram', entry: [{ changes: [] }] }))).toEqual([]);
  });

  it('keeps unknown fields in the payload (Meta may add fields)', () => {
    const [event] = parse(
      JSON.stringify({
        object: 'page',
        entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: '1', new_field: true } }] }],
      }),
    );
    expect(event?.payload).toMatchObject({ new_field: true });
  });

  it('rejects invalid JSON', () => {
    expect(() => parse('{not json')).toThrow(ValidationError);
  });

  it('rejects a body that is not Meta-shaped', () => {
    expect(() => parse('{"hello":"world"}')).toThrow(ValidationError);
  });

  it('rejects a leadgen change without leadgen_id', () => {
    expect(() =>
      parse(
        JSON.stringify({
          object: 'page',
          entry: [{ changes: [{ field: 'leadgen', value: { page_id: '1' } }] }],
        }),
      ),
    ).toThrow(ValidationError);
  });
});
