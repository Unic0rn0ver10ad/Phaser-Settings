import { SettingsManager } from 'phaser-settings';

interface ControlsPanelProps {
  manager: SettingsManager | null;
}

export function ControlsPanel({ manager }: ControlsPanelProps) {
  if (!manager) {
    return (
      <div className="controls-panel">
        <p>Loading…</p>
      </div>
    );
  }

  const schema = manager.getSchema();
  const values = schema.definitions
    .filter((d) => d.type !== 'section' && d.type !== 'action')
    .map((d) => ({ id: d.id, label: d.label, value: manager.getOrDefault(d.id) }));

  return (
    <div className="controls-panel">
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Live values (from SettingsManager)</h3>
      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
        {values.map(({ id, label, value }) => (
          <li key={id}>
            <strong>{label}</strong>: <code>{String(value)}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
