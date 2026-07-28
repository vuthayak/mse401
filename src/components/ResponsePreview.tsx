import type { CSSProperties } from 'react';
import type {
  SurveyAResponse,
  SurveyBResponse,
  SurveyCResponse,
} from '../types/survey';

interface ResponsePreviewProps {
  record: SurveyAResponse | SurveyBResponse | SurveyCResponse;
}

function publicRecord(
  record: SurveyAResponse | SurveyBResponse | SurveyCResponse,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...record };
  delete copy.session_token;
  delete copy.id;
  return copy;
}

export function ResponsePreview({ record }: ResponsePreviewProps) {
  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Survey Response</h2>
      <pre style={styles.pre}>{JSON.stringify(publicRecord(record), null, 2)}</pre>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    marginTop: 24,
    padding: 16,
    background: '#fff',
    border: '1px solid #767676',
    borderRadius: 8,
    overflow: 'auto',
  },
  heading: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 600,
  },
  pre: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
};
