import { useState } from 'react';
import { Link, Outlet } from 'react-router';

import { ActorPrompt } from '../components/actor-prompt';
import { Button } from '../components/button';
import { useActor } from '../hooks/use-actor';

export function AppLayout() {
  const [actor, setActor] = useActor();
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="inline-block size-3 rounded-sm bg-accent" />
            Lead Intake
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {actor && (
              <span className="hidden text-ink-muted sm:inline">
                Acting as <span className="font-medium text-ink">{actor}</span>
              </span>
            )}
            <Button variant="ghost" onClick={() => setPromptOpen(true)}>
              {actor ? 'Change name' : 'Set your name'}
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {promptOpen && (
        <ActorPrompt open onOpenChange={setPromptOpen} initialName={actor} onSave={setActor} />
      )}
    </div>
  );
}
