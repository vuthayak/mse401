import type { CSSProperties } from 'react';
import type { ProductContext } from '../types/survey';

interface ProductHeaderProps {
  product: ProductContext;
  variant?: 'clinical' | 'warm';
}

export function ProductHeader({ product, variant = 'clinical' }: ProductHeaderProps) {
  const isClinical = variant === 'clinical';

  return (
    <header
      style={{
        ...styles.header,
        background: isClinical ? '#fff' : '#faf6f0',
        borderColor: isClinical ? '#ddd' : '#e0d5c5',
      }}
    >
      <div
        style={{
          ...styles.thumbnail,
          background: isClinical ? '#e8e8e8' : '#e8dfd0',
        }}
        aria-hidden="true"
      >
        <span style={styles.thumbnailText}>IMG</span>
      </div>
      <div style={styles.info}>
        <h1 style={styles.name}>{product.display_name}</h1>
        <p style={styles.meta}>
          Size {product.current_size} · {product.display_color}
        </p>
        <p style={styles.sku}>{product.scanned_sku}</p>
        <div style={styles.tags}>
          {product.categorical_tags.map((tag) => (
            <span key={tag} style={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    gap: 16,
    padding: 16,
    border: '1px solid',
    borderRadius: 8,
    marginBottom: 20,
  },
  thumbnail: {
    width: 80,
    height: 100,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbnailText: {
    fontSize: 14,
    color: '#888',
    fontWeight: 600,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    margin: '0 0 4px',
    fontSize: 20,
    fontWeight: 600,
  },
  meta: {
    margin: '0 0 4px',
    color: '#555',
    fontSize: 16,
  },
  sku: {
    margin: '0 0 8px',
    color: '#999',
    fontSize: 13,
    fontFamily: 'ui-monospace, monospace',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 12,
    padding: '4px 8px',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
  },
};
