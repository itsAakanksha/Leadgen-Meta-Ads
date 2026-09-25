import { IconContext } from '@phosphor-icons/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createQueryClient } from '@/lib/query-client';

export function AppProvider({ children }: { children: ReactNode }) {
  // Lazy init: one client for the app's lifetime.
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {/* Precise, light-weight icons by default (DESIGN.md §4); small glyphs opt into heavier weights. */}
      <IconContext.Provider value={{ weight: 'light' }}>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </IconContext.Provider>
    </QueryClientProvider>
  );
}
