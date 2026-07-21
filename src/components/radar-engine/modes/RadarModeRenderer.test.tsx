import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RadarModeRenderer } from './RadarModeRenderer';
import { buildRadarScene } from '../../../lib/radar-engine/sceneBuilder';
import { DEFAULT_ALERT_ZONES } from '../../../radar/alertZones';
import type { RadarRenderMode } from '../../../lib/radar-engine/types';

const TIMESTAMP = 1_700_000_000_000;
const CENTER = { lat: 24.7, lon: 46.7 };

const IMPLEMENTED: RadarRenderMode[] = [
  'tactical',
  'mission-control',
  'classic',
];

function demoScene() {
  return buildRadarScene({
    aircraft: [
      {
        id: 'AC1',
        callsign: 'MRA1',
        lat: 24.71,
        lon: 46.71,
        distance_km: 2,
        heading_deg: 90,
        updated_at: TIMESTAMP,
      },
      {
        id: 'AC2',
        callsign: 'MRA2',
        lat: 24.66,
        lon: 46.72,
        distance_km: 8,
        heading_deg: 180,
        updated_at: TIMESTAMP,
      },
      {
        id: 'AC3',
        callsign: 'MRA3',
        lat: 24.72,
        lon: 46.62,
        distance_km: 20,
        heading_deg: 270,
        updated_at: TIMESTAMP,
      },
    ],
    center: CENTER,
    rangeKm: 50,
    altitudeFilter: 'all',
    alertZones: DEFAULT_ALERT_ZONES,
    selectedTargetId: 'AC1',
    sourceState: 'DEMO',
    trails: {
      AC1: [
        [24.7, 46.7],
        [24.705, 46.705],
        [24.71, 46.71],
      ],
    },
    timestamp: TIMESTAMP,
  });
}

function render(
  mode: RadarRenderMode,
  overrides: Partial<{ showLabels: boolean; showTrails: boolean }> = {}
) {
  return renderToStaticMarkup(
    <RadarModeRenderer
      mode={mode}
      scene={demoScene()}
      paused={false}
      showLabels={overrides.showLabels ?? true}
      showTrails={overrides.showTrails ?? true}
      onSelectTarget={() => {}}
    />
  );
}

function countTargets(markup: string) {
  return (markup.match(/class="radar-target /g) || []).length;
}

describe('RadarModeRenderer — every implemented mode', () => {
  it('renders all three targets in every mode (sweep never hides targets)', () => {
    for (const mode of IMPLEMENTED) {
      expect(countTargets(render(mode))).toBe(3);
    }
  });

  it('renders the selected target and its bracket in every mode', () => {
    for (const mode of IMPLEMENTED) {
      const markup = render(mode);
      expect(markup).toContain('is-selected');
      expect(markup).toContain('radar-selection-bracket');
    }
  });

  it('honors the labels toggle in every mode', () => {
    for (const mode of IMPLEMENTED) {
      expect(render(mode, { showLabels: true })).toContain(
        'radar-target-label'
      );
      expect(render(mode, { showLabels: false })).not.toContain(
        'radar-target-label'
      );
    }
  });

  it('honors the trails toggle in every mode', () => {
    for (const mode of IMPLEMENTED) {
      expect(render(mode, { showTrails: true })).toContain('radar-trail');
      expect(render(mode, { showTrails: false })).not.toContain('radar-trail');
    }
  });

  it('never renders DEMO data with LIVE wording in any mode', () => {
    for (const mode of IMPLEMENTED) {
      const markup = render(mode);
      expect(markup).not.toMatch(/\bLIVE\b/);
      expect(markup).not.toMatch(/Live target/);
      expect(markup).not.toMatch(/Live airspace/);
    }
  });

  it('falls back to Tactical layer set for a not-yet-implemented mode', () => {
    // presentation is not implemented; renderer should still produce a scope.
    const markup = renderToStaticMarkup(
      <RadarModeRenderer
        mode={'presentation' as RadarRenderMode}
        scene={demoScene()}
        paused={false}
        showLabels
        showTrails
        onSelectTarget={() => {}}
      />
    );
    expect(markup).toContain('radar-scope');
    expect(countTargets(markup)).toBe(3);
  });
});

describe('shared animation foundation', () => {
  const appCss = readFileSync(
    new URL('../../../App.css', import.meta.url),
    'utf8'
  );
  const radarEngineCss = readFileSync(
    new URL('../../../radarEngine.css', import.meta.url),
    'utf8'
  );

  it('declares exactly one sweep keyframe animation (single shared source)', () => {
    const matches = appCss.match(/@keyframes radar-sweep/g) || [];
    expect(matches).toHaveLength(1);
  });

  it('drives sweep duration from a CSS variable rather than a hardcoded value', () => {
    expect(appCss).toMatch(
      /animation: radar-sweep var\(--radar-sweep-duration/
    );
  });

  it('stops sweep rotation under reduced motion in base and classic modes', () => {
    expect(appCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.radar-sweep path[\s\S]*animation: none/
    );
    expect(radarEngineCss).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*radar-mode-classic[\s\S]*animation: none/
    );
  });

  it('uses no per-target or per-layer JS animation loop', () => {
    // The sweep is CSS-only; no layer or mode component may spin its own clock.
    const files = [
      '../layers/AircraftLayer.tsx',
      '../layers/SweepLayer.tsx',
      '../layers/TrailLayer.tsx',
      '../RadarViewport.tsx',
      './TacticalRadarMode.tsx',
      './MissionControlRadarMode.tsx',
      './ClassicRadarMode.tsx',
    ];
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(source).not.toMatch(/requestAnimationFrame|setInterval/);
    }
  });
});
