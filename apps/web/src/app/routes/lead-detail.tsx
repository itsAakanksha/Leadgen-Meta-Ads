import { useParams } from 'react-router';

export function LeadDetailRoute() {
  const { id } = useParams();
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Lead</h1>
      <p className="font-mono text-sm text-ink-muted">{id}</p>
    </section>
  );
}
