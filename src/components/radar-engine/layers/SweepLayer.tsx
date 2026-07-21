import type { RadarLayerProps } from './types';

/**
 * Pause is driven by an `.is-paused` class on the enclosing viewport
 * element (see RadarViewport) so the CSS animation can be paused
 * without a JS animation loop, matching today's sweep behavior.
 */
export function SweepLayer(_props: RadarLayerProps) {
  return (
    <g className="radar-sweep" aria-hidden="true">
      <path d="M0 0L0-220A220 220 0 0 1 38-217Z" />
    </g>
  );
}
