export function MobileChrome({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <button className="mobile-menu-btn" onClick={onToggle} aria-label="Open menu">
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div
        className={`mobile-backdrop ${open ? 'open' : ''}`}
        onClick={onToggle}
      />
    </>
  );
}
