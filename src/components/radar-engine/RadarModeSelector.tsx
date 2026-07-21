import { listImplementedModes } from '../../lib/radar-engine/modeRegistry';
import type { RadarRenderMode } from '../../lib/radar-engine/types';

/**
 * Production render-mode selector. Exposes only implemented modes
 * (`listImplementedModes()`), never placeholders. Native radio inputs
 * give keyboard + touch operation and visible focus for free; each
 * option carries a non-color text description. A reset control restores
 * the default (Tactical). The aria-live mode-change announcement lives
 * in RadarScreen so it fires once per actual change.
 */
export function RadarModeSelector({
  mode,
  defaultMode,
  onChange,
}: {
  mode: RadarRenderMode;
  defaultMode: RadarRenderMode;
  onChange: (mode: RadarRenderMode) => void;
}) {
  const modes = listImplementedModes();
  return (
    <fieldset className="radar-mode-selector">
      <legend>Render mode</legend>
      <div
        className="radar-mode-options"
        role="radiogroup"
        aria-label="Radar render mode"
      >
        {modes.map((profile) => (
          <label key={profile.id} className="radar-mode-option">
            <input
              type="radio"
              name="radar-render-mode"
              value={profile.id}
              checked={mode === profile.id}
              onChange={() => onChange(profile.id)}
            />
            <span className="radar-mode-option-text">
              <span className="radar-mode-option-label">{profile.label}</span>
              <span className="radar-mode-option-desc">
                {profile.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="radar-mode-reset"
        onClick={() => onChange(defaultMode)}
        disabled={mode === defaultMode}
      >
        Reset to default
      </button>
    </fieldset>
  );
}
