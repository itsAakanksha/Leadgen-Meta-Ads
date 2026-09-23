import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function NotFoundRoute() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">This address doesn’t match any page.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to leads</Link>
      </Button>
    </section>
  );
}
