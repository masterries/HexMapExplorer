import type { MutableRefObject } from 'react';

export function MapView({
  containerRef,
}: {
  containerRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex-grow z-10 relative">
      <div id="map" ref={containerRef} />
    </div>
  );
}
