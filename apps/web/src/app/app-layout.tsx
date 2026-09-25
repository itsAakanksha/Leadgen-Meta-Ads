import { ShieldCheckIcon, TrayIcon, UserCircleIcon, type Icon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { ActorPrompt } from '@/components/actor-prompt';
import { useActor } from '@/hooks/use-actor';
import { cn } from '@/lib/utils';

function NavItem({
  to,
  icon: IconComponent,
  active,
  children,
}: {
  to: string;
  icon: Icon;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-xl px-3 text-sm transition-[background-color,color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-card font-medium text-foreground shadow-core'
          : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
      )}
    >
      <IconComponent
        aria-hidden
        weight={active ? 'fill' : 'light'}
        className={cn('size-4', active && 'text-primary')}
      />
      {children}
    </Link>
  );
}

/**
 * App chrome. One header element: a top bar on small screens, a sidebar from `lg` up.
 * Pages render on a raised canvas so the chrome recedes and the work stands forward.
 */
export function AppLayout() {
  const [actor, setActor] = useActor();
  const [promptOpen, setPromptOpen] = useState(false);
  const { pathname } = useLocation();
  const onLeads = pathname === '/' || pathname.startsWith('/leads');

  return (
    <div className="grain min-h-dvh bg-frame">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-frame/90 px-4 backdrop-blur-md sm:px-6 lg:fixed lg:inset-y-0 lg:left-0 lg:h-auto lg:w-60 lg:flex-col lg:items-stretch lg:justify-start lg:border-0 lg:bg-frame lg:px-3 lg:py-4">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-1 text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-2"
        >
          <img src="/logo-192.png" alt="" aria-hidden className="size-8 shrink-0" />
          Lead Intake
        </Link>

        <nav
          aria-label="Main"
          className="hidden gap-0.5 rounded-2xl bg-tray p-1 ring-1 ring-foreground/5 lg:mt-8 lg:grid"
        >
          <NavItem to="/" icon={TrayIcon} active={onLeads}>
            Leads
          </NavItem>
        </nav>

        <div className="flex items-center gap-1 lg:mt-auto lg:grid lg:gap-2">
          <div className="hidden px-1 lg:grid">
            <NavItem to="/privacy" icon={ShieldCheckIcon} active={pathname === '/privacy'}>
              Privacy
            </NavItem>
          </div>
          <button
            type="button"
            onClick={() => setPromptOpen(true)}
            className="-mr-2 flex h-11 min-w-0 items-center gap-2.5 rounded-xl px-2 text-left text-sm transition-[background-color,box-shadow] duration-200 outline-none hover:bg-card/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] lg:mr-0 lg:h-14 lg:rounded-2xl lg:bg-card lg:px-3 lg:shadow-core lg:hover:bg-card"
          >
            {actor ? (
              <>
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-foreground text-xs font-semibold text-background"
                >
                  {actor.charAt(0).toUpperCase()}
                </span>
                <span className="grid min-w-0 leading-tight">
                  <span className="text-xs text-muted-foreground">Acting as</span>{' '}
                  <span className="truncate font-medium">{actor}</span>
                </span>
              </>
            ) : (
              <>
                <UserCircleIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                <span className="font-medium">Set your name</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="lg:py-2 lg:pr-2 lg:pl-60">
        <main
          id="main"
          className="relative min-h-[calc(100dvh-3.5rem)] bg-background lg:min-h-[calc(100dvh-1rem)] lg:rounded-[1.25rem] lg:shadow-canvas"
        >
          <div className="mx-auto max-w-6xl px-4 pt-7 pb-20 sm:px-6 lg:px-10 lg:pt-11">
            <Outlet />
          </div>
        </main>
      </div>

      {promptOpen ? (
        <ActorPrompt open onOpenChange={setPromptOpen} initialName={actor} onSave={setActor} />
      ) : null}
    </div>
  );
}
