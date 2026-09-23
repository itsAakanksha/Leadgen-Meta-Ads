import { createBrowserRouter } from 'react-router';

import { AppLayout } from './app-layout';
import { loadLeadDetailRoute } from './lazy-routes';
import { LeadsListRoute } from './routes/leads-list';
import { NotFoundRoute } from './routes/not-found';
import { PrivacyRoute } from './routes/privacy';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <LeadsListRoute /> },
      { path: 'leads/:id', lazy: loadLeadDetailRoute },
      { path: 'privacy', element: <PrivacyRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
