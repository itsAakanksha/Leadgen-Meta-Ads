import { MegaphoneSimpleIcon } from '@phosphor-icons/react';

import { formatDateTime } from '@/lib/format';

import { sourceLabel } from '../source-label';
import type { LeadDetail } from '../types';
import { DetailList, DetailSection, Empty } from './detail-section';

const Mono = ({ children }: { children: string | null }) =>
  children ? (
    <span className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-xs text-foreground/90 ring-1 ring-hairline">
      {children}
    </span>
  ) : (
    <Empty />
  );

const Text = ({ children }: { children: string | null }) =>
  children ? <>{children}</> : <Empty />;

/** Where the lead came from. Ad fields are empty for organic and test leads. */
export function LeadAttribution({ lead }: { lead: LeadDetail }) {
  return (
    <DetailSection title="Source" icon={MegaphoneSimpleIcon}>
      <DetailList
        items={[
          { label: 'Channel', value: sourceLabel(lead.platform, lead.isOrganic) },
          { label: 'Campaign', value: <Text>{lead.campaignName}</Text> },
          { label: 'Ad set', value: <Text>{lead.adsetName}</Text> },
          { label: 'Ad', value: <Text>{lead.adName}</Text> },
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
