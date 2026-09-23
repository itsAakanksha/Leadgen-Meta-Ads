import { humanizeKey } from '../humanize-key';
import type { FieldDataItem } from '../types';
import { DetailList, DetailSection } from './detail-section';

/** Every answer from the Meta form, as submitted (including custom questions). */
export function LeadAnswers({ fieldData }: { fieldData: FieldDataItem[] }) {
  return (
    <DetailSection title="Form answers">
      {fieldData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Meta returned no answers for this lead.</p>
      ) : (
        <DetailList
          items={fieldData.map((item) => ({
            label: humanizeKey(item.name),
            value: item.values.length > 0 ? item.values.join(', ') : '—',
          }))}
        />
      )}
    </DetailSection>
  );
}
