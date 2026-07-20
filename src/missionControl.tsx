import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from 'react';
import type { SourceState } from './missionControlState';

export type LampState =
  'active' | 'selected' | 'caution' | 'critical' | 'offline';

const SOURCE_LAMP: Record<SourceState, LampState> = {
  DEMO: 'caution',
  CACHE: 'caution',
  LIVE: 'active',
  OFFLINE: 'offline',
};

export function ModuleIdentifier({ children }: PropsWithChildren) {
  return <span className="mission-module-id">{children}</span>;
}

export function MissionPanelHeader({
  moduleId,
  title,
  meta,
}: {
  moduleId: string;
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mission-panel-header">
      <div>
        <ModuleIdentifier>{moduleId}</ModuleIdentifier>
        <h2>{title}</h2>
      </div>
      {meta ? <div className="mission-panel-meta">{meta}</div> : null}
    </header>
  );
}

export function MissionPanel({
  as = 'section',
  className = '',
  children,
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    as?: 'section' | 'aside' | 'div';
  }
>) {
  const Tag = as;
  return (
    <Tag className={`mission-panel ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function InsetDisplay({
  className = '',
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={`mission-inset ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function TelemetryReadout({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'active' | 'caution' | 'critical';
}) {
  return (
    <div className={`mission-readout is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusLamp({
  state,
  label,
}: {
  state: LampState;
  label: string;
}) {
  return (
    <span className={`mission-status-lamp is-${state}`}>
      <i aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function SourceStateBadge({ state }: { state: SourceState }) {
  return (
    <span className={`mission-source-state is-${state.toLowerCase()}`}>
      <StatusLamp state={SOURCE_LAMP[state]} label={state} />
    </span>
  );
}

export function SegmentedMeter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const safeMax = Math.max(1, max);
  const activeSegments = Math.round(
    (Math.min(Math.max(value, 0), safeMax) / safeMax) * 8
  );
  return (
    <div className="mission-meter" aria-label={`${label}: ${value} of ${max}`}>
      <span>{label}</span>
      <div aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i
            key={index}
            className={index < activeSegments ? 'is-active' : ''}
          />
        ))}
      </div>
    </div>
  );
}

export function ChamferButton({
  className = '',
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={`mission-chamfer-button ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function TechnicalDivider() {
  return <div className="mission-divider" aria-hidden="true" />;
}

export function SystemStatusStrip({ children }: PropsWithChildren) {
  return (
    <footer className="mission-system-strip" aria-label="System status">
      {children}
    </footer>
  );
}
