import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RadarModeSelector } from './RadarModeSelector';
import { listImplementedModes } from '../../lib/radar-engine/modeRegistry';
import type { RadarRenderMode } from '../../lib/radar-engine/types';

function markup(mode: RadarRenderMode = 'tactical') {
  return renderToStaticMarkup(
    <RadarModeSelector mode={mode} defaultMode="tactical" onChange={() => {}} />
  );
}

describe('RadarModeSelector', () => {
  it('exposes exactly the implemented modes, no placeholders', () => {
    const html = markup();
    const modes = listImplementedModes();
    expect(modes).toHaveLength(5);
    for (const profile of modes) {
      expect(html).toContain(`value="${profile.id}"`);
      expect(html).toContain(profile.label);
      expect(html).toContain(profile.description);
    }
  });

  it('renders an accessible radiogroup with native radios (keyboard operable)', () => {
    const html = markup();
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('type="radio"');
    expect(html).toContain('aria-label="Radar render mode"');
  });

  it('marks the active mode as checked', () => {
    const html = markup('classic');
    // The classic radio should be the checked one.
    const classicChunk = html.slice(
      html.indexOf('value="classic"') - 60,
      html.indexOf('value="classic"') + 20
    );
    expect(classicChunk).toContain('checked');
  });

  it('disables reset when already on the default mode', () => {
    expect(markup('tactical')).toMatch(/radar-mode-reset[^>]*disabled/);
  });

  it('enables reset when on a non-default mode', () => {
    const html = markup('presentation');
    const resetChunk = html.slice(html.indexOf('radar-mode-reset'));
    expect(resetChunk.slice(0, 40)).not.toContain('disabled');
  });
});
