import type { SurveyItem } from '../types/survey';

interface ProductHeaderProps {
  item: SurveyItem;
  variant?: 'clinical' | 'warm';
}

export function ProductHeader({ item, variant = 'clinical' }: ProductHeaderProps) {
  const isClinical = variant === 'clinical';

  return (
    <header
      className="product-header"
      style={{
        background: isClinical ? '#fff' : '#faf6f0',
        borderColor: isClinical ? '#ddd' : '#e0d5c5',
      }}
    >
      <div
        className="product-header-thumb"
        style={{ background: isClinical ? '#e8e8e8' : '#e8dfd0' }}
        aria-hidden="true"
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="product-header-thumb-img" />
        ) : (
          <span className="product-header-thumb-text">IMG</span>
        )}
      </div>
      <div className="product-header-info">
        <h1 className="product-header-name">{item.title}</h1>
        <p className="product-header-tagline">{item.tagline}</p>
      </div>
    </header>
  );
}
