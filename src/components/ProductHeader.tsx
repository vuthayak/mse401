import type { ElementType } from 'react';
import type { SurveyItem } from '../types/survey';

interface ProductHeaderProps {
  item: SurveyItem;
  variant?: 'clinical' | 'warm';
  headingLevel?: 1 | 2;
}

export function ProductHeader({
  item,
  variant = 'clinical',
  headingLevel = 1,
}: ProductHeaderProps) {
  const isClinical = variant === 'clinical';
  const Heading: ElementType = headingLevel === 2 ? 'h2' : 'h1';

  return (
    <header
      className="product-header"
      style={{
        background: isClinical ? '#fff' : '#faf6f0',
        borderColor: isClinical ? '#767676' : '#8a7f6e',
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
        <Heading className="product-header-name">{item.title}</Heading>
        <p className="product-header-tagline">{item.tagline}</p>
      </div>
    </header>
  );
}
