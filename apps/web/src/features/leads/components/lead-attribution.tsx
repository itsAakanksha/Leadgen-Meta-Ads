import { formatDateTime } from '@/lib/format';

import { sourceLabel } from '../source-label';
import type { LeadDetail } from '../types';
import { DetailList, DetailSection } from './detail-section';

const Mono = ({ children }: { children: string | null }) =>
  children ? <span className="font-mono text-xs">{children}</span> : <>—</>;

/** Where the lead came from. Ad fields are empty for organic and test leads. */
export function LeadAttribution({ lead }: { lead: LeadDetail }) {
  return (
    <DetailSection title="Source">
      <DetailList
        items={[
          { label: 'Channel', value: sourceLabel(lead.platform, lead.isOrganic) },
          { label: 'Campaign', value: lead.campaignName ?? '—' },
          { label: 'Ad set', value: lead.adsetName ?? '—' },
          { label: 'Ad', value: lead.adName ?? '—' },
          { label: 'Form ID', value: <Mono>{lead.formId}</Mono> },
          { label: 'Meta lead ID', value: <Mono>{lead.leadgenId}</Mono> },
          {
            label: 'Submitted',
            value: <span className="tabular">{formatDateTime(lead.metaCreatedAt)}</span>,
          },
          {
            label: 'Received',
            value: <span className="tabular">{formatDateTime(lead.createdAt)}</span>,
          },
        ]}
      />
    </DetailSection>
  );
}
