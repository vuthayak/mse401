import {
  SURVEY_A_AXES,
  type AttributeKey,
  type ScaleRating,
} from '../types/survey';

interface ScaleOptionListProps {
  axisKey: AttributeKey;
  value?: ScaleRating;
  onSelect: (value: ScaleRating) => void;
  direction: 'horizontal' | 'vertical';
  labelMode?: 'all' | 'extremes';
  labelledBy?: string;
}

export function ScaleOptionList({
  axisKey,
  value,
  onSelect,
  direction,
  labelMode = 'all',
  labelledBy,
}: ScaleOptionListProps) {
  const axis = SURVEY_A_AXES.find((entry) => entry.key === axisKey);
  if (!axis) return null;

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={`scale-options scale-options--${direction}${
        labelMode === 'extremes' && direction === 'horizontal'
          ? ' scale-options--extremes'
          : ''
      }`}
    >
      {axis.options.map((opt) => {
        const selected = value === opt.value;
        const showLabel =
          labelMode === 'all' || opt.value === 1 || opt.value === 5;
        const stacked =
          labelMode === 'extremes' && direction === 'horizontal';

        // Use axis-specific option labels for extremes so visual and
        // accessible names match (e.g. Fit: "too loose" / "too tight").
        const extremeLabel =
          opt.value === 1 || opt.value === 5 ? opt.label : null;

        return (
          <button
            key={opt.value}
            type="button"
            className={`scale-option${selected ? ' selected' : ''}${
              stacked ? ' scale-option--stacked' : ''
            }${!showLabel && !stacked ? ' scale-option--icon-only' : ''}`}
            aria-pressed={selected}
            aria-label={`${axis.label}: ${opt.label}`}
            onClick={() => onSelect(opt.value)}
          >
            {stacked ? (
              <>
                <span className="scale-option-label-above" aria-hidden="true">
                  {showLabel && extremeLabel ? extremeLabel : ''}
                </span>
                <span className="scale-option-indicator" aria-hidden="true" />
              </>
            ) : (
              <>
                <span className="scale-option-indicator" aria-hidden="true" />
                {showLabel && (
                  <span className="scale-option-label" aria-hidden="true">
                    {opt.label}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ScaleAxisPanelProps {
  axisKey: AttributeKey;
  value?: ScaleRating;
  onSelect: (value: ScaleRating) => void;
}

export function ScaleAxisPanel({ axisKey, value, onSelect }: ScaleAxisPanelProps) {
  const axis = SURVEY_A_AXES.find((entry) => entry.key === axisKey);
  if (!axis) return null;

  const labelId = `scale-axis-${axis.key}-label`;

  return (
    <div className="scale-grid-cell">
      <h3 id={labelId} className="scale-grid-cell-label">
        {axis.label}
      </h3>
      <ScaleOptionList
        axisKey={axis.key}
        value={value}
        onSelect={onSelect}
        direction="horizontal"
        labelMode="extremes"
        labelledBy={labelId}
      />
    </div>
  );
}
