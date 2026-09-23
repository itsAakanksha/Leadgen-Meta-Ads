import { UserCircleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, Outlet } from 'react-router';

import { ActorPrompt } from '@/components/actor-prompt';
import { Button } from '@/components/ui/button';
import { useActor } from '@/hooks/use-actor';

export function AppLayout() {
  const [actor, setActor] = useActor();
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <span aria-hidden className="grid size-6 place-items-center rounded-md bg-primary">
              <span className="size-2 rounded-xs bg-primary-foreground" />
            </span>
            Lead Intake
          </Link>
          <Button variant="ghost" onClick={() => setPromptOpen(true)}>
            <UserCircleIcon aria-hidden />
            {actor ? (
              <span>
                <span className="text-muted-foreground">Acting as</span> {actor}
              </span>
            ) : (
              'Set your name'
            )}
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {promptOpen ? (
        <ActorPrompt open onOpenChange={setPromptOpen} initialName={actor} onSave={setActor} />
      ) : null}
    </div>
  );
}
