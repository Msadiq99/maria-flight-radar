import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RadarViewport } from './RadarViewport';
import { buildRadarScene } from '../../lib/radar-engine/sceneBuilder';
import {
  MINIMAL_PROFILE,
  TACTICAL_PROFILE,
} from '../../lib/radar-engine/renderProfiles';
import { DEFAULT_ALERT_ZONES } from '../../radar/alertZones';

const appCss = readFileSync(new URL('../../App.css', import.meta.url), 'utf8');

const TIMESTAMP = 1_700_000_000_000;
const CENTER = { lat: 24.7, lon: 46.7 };

function scene(selectedTargetId: string | null = 'AC1') {
  return buildRadarScene({
    aircraft: [
      {
        id: 'AC1',
        callsign: 'MRA123',
        lat: 24.71,
        lon: 46.71,
        distance_km: 2,
        heading_deg: 90,
        updated_at: TIMESTAMP,
      },
    ],
    center: CENTER,
    rangeKm: 50,
    altitudeFilter: 'all',
    alertZones: DEFAULT_ALERT_ZONES,
    selectedTargetId,
    sourceState: 'DEMO',
    timestamp: TIMESTAMP,
  });
}

describe('RadarViewport layer visibility', () => {
  it('renders the sweep and alert-zone layers for the Tactical profile', () => {
    const markup = renderToStaticMarkup(
      <RadarViewport
        scene={scene()}
        profile={TACTICAL_PROFILE}
        paused={false}
        showLabels
        showTrails
        onSelectTarget={() => {}}
      />
    );
    expect(markup).toContain('radar-sweep');
    expect(markup).toContain('radar-zone-ring');
  });

  it('omits layers not declared in a profile (e.g. sweep/alert-zone for Minimal)', () => {
    const markup = renderToStaticMarkup(
      <RadarViewport
        scene={scene()}
        profile={MINIMAL_PROFILE}
        paused={false}
        showLabels={false}
        showTrails={false}
        onSelectTarget={() => {}}
      />
    );
    expect(markup).not.toContain('radar-sweep');
    expect(markup).not.toContain('radar-zone-ring');
  });

  it('renders a selection bracket only for the selected target', () => {
    const withSelection = renderToStaticMarkup(
      <RadarViewport
        scene={scene('AC1')}
        profile={TACTICAL_PROFILE}
        paused={false}
        showLabels
        showTrails
        onSelectTarget={() => {}}
      />
    );
    const withoutSelection = renderToStaticMarkup(
      <RadarViewport
        scene={scene(null)}
        profile={TACTICAL_PROFILE}
        paused={false}
        showLabels
        showTrails
        onSelectTarget={() => {}}
      />
    );
    expect(withSelection).toContain('radar-selection-bracket');
    expect(withoutSelection).not.toContain('radar-selection-bracket');
  });

  it('marks the viewport paused via a class the CSS animation reads, not inline styles', () => {
    const markup = renderToStaticMarkup(
      <RadarViewport
        scene={scene()}
        profile={TACTICAL_PROFILE}
        paused
        showLabels
        showTrails
        onSelectTarget={() => {}}
      />
    );
    expect(markup).toContain('is-paused');
  });

  it('the sweep animation still has a reduced-motion fallback defined in CSS', () => {
    expect(appCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(appCss).toMatch(/\.radar-sweep path[\s\S]*animation: none/);
  });
});
