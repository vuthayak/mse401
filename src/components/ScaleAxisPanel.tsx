import {
  SURVEY_A_AXES,
  SCALE_EXTREME_HIGH_LABEL,
  SCALE_EXTREME_LOW_LABEL,
  type AttributeKey,
  type ScaleRating,
} from '../types/survey';

interface ScaleOptionListProps {
  axisKey: AttributeKey;
  value?: ScaleRating;
  onSelect: (value: ScaleRating) => void;
  direction: 'horizontal' | 'vertical';
  labelMode?: 'all' | 'extremes';
}

export function ScaleOptionList({
  axisKey,
  value,
  onSelect,
  direction,
  labelMode = 'all',
}: ScaleOptionListProps) {
  const axis = SURVEY_A_AXES.find((entry) => entry.key === axisKey);
  if (!axis) return null;

  return (
    <div
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

        const extremeLabel =
          opt.value === 1
            ? SCALE_EXTREME_LOW_LABEL
            : opt.value === 5
              ? SCALE_EXTREME_HIGH_LABEL
              : null;

        return (
          <button
            key={opt.value}
            type="button"
            className={`scale-option${selected ? ' selected' : ''}${
              stacked ? ' scale-option--stacked' : ''
            }${!showLabel && !stacked ? ' scale-option--icon-only' : ''}`}
            aria-pressed={selected}
            aria-label={opt.label}
            onClick={() => onSelect(opt.value)}
          >
            {stacked ? (
              <>
                <span className="scale-option-label-above">
                  {showLabel && extremeLabel ? extremeLabel : ''}
                </span>
                <span className="scale-option-indicator" aria-hidden="true" />
              </>
            ) : (
              <>
                <span className="scale-option-indicator" aria-hidden="true" />
                {showLabel && (
                  <span className="scale-option-label">{opt.label}</span>
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

  return (
    <div className="scale-grid-cell">
      <h3 className="scale-grid-cell-label">{axis.label}</h3>
      <ScaleOptionList
        axisKey={axisKey}
        value={value}
        onSelect={onSelect}
        direction="horizontal"
        labelMode="extremes"
      />
    </div>
  );
}
