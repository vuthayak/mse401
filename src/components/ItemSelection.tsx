import { Link } from 'react-router-dom';
import type { SurveyItem } from '../types/survey';
import { SURVEY_ITEMS } from '../types/survey';

interface ItemSelectionProps {
  variant: 'clinical' | 'warm';
  onSelect: (item: SurveyItem) => void;
}

export function ItemSelection({ variant, onSelect }: ItemSelectionProps) {
  const isClinical = variant === 'clinical';

  return (
    <div className="item-selection">
      <div className="item-selection-header">
        <h2 className="item-selection-heading">Choose an item</h2>
        <p className="item-selection-subheading">Select the product you tried on.</p>
      </div>
      <div className="item-selection-list">
        {SURVEY_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="choice-btn item-selection-row"
            style={{
              background: isClinical ? '#fff' : '#faf6f0',
              borderColor: isClinical ? '#ddd' : '#e0d5c5',
            }}
            onClick={() => onSelect(item)}
          >
            <div
              className="item-selection-thumb"
              style={{ background: isClinical ? '#e8e8e8' : '#e8dfd0' }}
              aria-hidden="true"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="item-selection-thumb-img" />
              ) : (
                <span className="item-selection-thumb-text">IMG</span>
              )}
            </div>
            <div className="item-selection-text">
              <span className="item-selection-title">{item.title}</span>
              <span className="item-selection-tagline">{item.tagline}</span>
            </div>
          </button>
        ))}
      </div>
      <Link to="/" className="survey-back-link">
        ← Back to samples
      </Link>
    </div>
  );
}
