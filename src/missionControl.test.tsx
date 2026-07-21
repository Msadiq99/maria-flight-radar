import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EmptyModuleState,
  MissionPanel,
  MissionPanelHeader,
  SourceStateBadge,
  SystemStatusStrip,
  TelemetryReadout,
} from './missionControl';
import {
  deriveSourceState,
  emptySelectionMessage,
  selectedTargetStateWording,
} from './missionControlState';

const missionControlCss = readFileSync(
  new URL('./missionControl.css', import.meta.url),
  'utf8'
);

describe('mission-control source states', () => {
  it.each([
    ['DEMO', 'is-demo'],
    ['CACHE', 'is-cache'],
    ['LIVE', 'is-live'],
    ['OFFLINE', 'is-offline'],
  ] as const)('renders %s with its semantic class', (state, className) => {
    const html = renderToStaticMarkup(<SourceStateBadge state={state} />);
    expect(html).toContain(`class="mission-source-state ${className}"`);
    expect(html).toContain(state);
  });

  it('never resolves simulator data to LIVE', () => {
    expect(
      deriveSourceState({ unreachable: false, stale: false, demo: true })
    ).toBe('DEMO');
    expect(
      renderToStaticMarkup(<SourceStateBadge state="DEMO" />)
    ).not.toContain('LIVE');
  });

  it('uses truthful selected-aircraft wording', () => {
    expect(selectedTargetStateWording('Critical', 'DEMO', 'Live')).toBe(
      'Critical zone · Demo target'
    );
    expect(selectedTargetStateWording('Warning', 'CACHE', 'Live')).toBe(
      'Warning zone · Cached target'
    );
  });
});

describe('mission-control structure and accessibility', () => {
  it('renders responsive module primitives and system values', () => {
    const html = renderToStaticMarkup(
      <>
        <MissionPanel aria-label="Radar scope">
          <MissionPanelHeader moduleId="RDR-01" title="Airspace scope" />
        </MissionPanel>
        <SystemStatusStrip>
          <TelemetryReadout label="Source" value="DEMO" />
          <TelemetryReadout label="Aircraft" value="8/8" />
        </SystemStatusStrip>
      </>
    );
    expect(html).toContain('mission-panel');
    expect(html).toContain('RDR-01');
    expect(html).toContain('aria-label="System status"');
    expect(html).toContain('8/8');
  });

  it('defines visible focus, responsive grids, and reduced motion', () => {
    expect(missionControlCss).toContain(':focus-visible');
    expect(missionControlCss).toContain(
      'outline: 3px solid var(--maria-focus)'
    );
    expect(missionControlCss).toContain('@media (max-width: 1100px)');
    expect(missionControlCss).toContain('@media (max-width: 720px)');
    expect(missionControlCss).toContain(
      '@media (prefers-reduced-motion: reduce)'
    );
    expect(missionControlCss).toMatch(
      /radar-sweep path\s*{[^}]*animation: none/s
    );
  });

  it('provides explicit empty target states', () => {
    expect(emptySelectionMessage({ unreachable: true, visibleCount: 0 })).toBe(
      'Traffic feed unavailable.'
    );
    expect(emptySelectionMessage({ unreachable: false, visibleCount: 2 })).toBe(
      'No aircraft selected.'
    );
    expect(emptySelectionMessage({ unreachable: false, visibleCount: 0 })).toBe(
      'No aircraft match the current filters.'
    );
    expect(
      renderToStaticMarkup(
        <EmptyModuleState>No aircraft selected.</EmptyModuleState>
      )
    ).toContain('role="status"');
  });
});
