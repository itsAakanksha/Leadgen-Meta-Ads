import { Link } from 'react-router';

import { buttonClasses } from '../../components/button';

export function NotFoundRoute() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-ink-muted">This address doesn’t match any page.</p>
      <Link to="/" className={buttonClasses('primary', 'mt-6')}>
        Back to leads
      </Link>
    </section>
  );
}
