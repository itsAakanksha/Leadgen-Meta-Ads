/**
 * Code-split routes. The detail page is not needed for the first paint of the list, so it
 * loads on demand, and is preloaded when the user shows intent (hovering a lead).
 */
export const loadLeadDetailRoute = () =>
  import('./routes/lead-detail').then((module) => ({ Component: module.LeadDetailRoute }));
