import type { ReactNode } from 'react';

export function Sidebar({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      id="sidebar"
      className={`w-1/4 min-w-[380px] glass-panel z-20 flex flex-col p-6 overflow-y-auto relative ${
        open ? 'open' : ''
      }`}
    >
      {children}
    </div>
  );
}
