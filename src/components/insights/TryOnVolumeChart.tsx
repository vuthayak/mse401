import { useId, useMemo } from 'react';
import {
  volumeOverTime,
  type InsightsPeriod,
  type VolumeSeries,
} from '../../lib/storeInsights';
import type { SurveyCInsightRow } from '../../lib/fetchSurveyCInsights';
import { PeriodSelector } from './PeriodSelector';

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 18, right: 48, bottom: 36, left: 48 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function yTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) =>
    Math.round(step * i * 10) / 10,
  );
}

/** Evenly spaced integer ticks from 0 to max (inclusive). */
function countTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => step * i);
}

function formatTick(value: number, asPercent: boolean): string {
  if (asPercent) {
    return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ComboSvg({ series }: { series: VolumeSeries }) {
  const gradId = useId().replace(/:/g, '');
  const { buckets, maxTryOns, maxConversionRate } = series;
  const n = buckets.length;
  const slot = n === 0 ? PLOT_W : PLOT_W / n;
  const barWidth = Math.max(4, Math.min(44, slot * 0.78));

  const xCenter = (i: number) => PAD.left + slot * i + slot / 2;
  const yTryOn = (count: number) =>
    PAD.top + PLOT_H - (count / maxTryOns) * PLOT_H;
  const yConv = (rate: number) =>
    PAD.top + PLOT_H - (rate / maxConversionRate) * PLOT_H;

  const tryOnTicks = countTicks(maxTryOns);
  const convTicks = yTicks(maxConversionRate);

  const linePoints =
    n === 0
      ? ''
      : buckets
          .map((b, i) => `${xCenter(i)},${yConv(b.conversionRate)}`)
          .join(' ');

  const labelEvery = n <= 8 ? 1 : n <= 16 ? 2 : Math.ceil(n / 8);

  return (
    <svg
      className="insights-combo-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Try-on volume bars with conversion rate line over time"
    >
      <defs>
        <linearGradient id={`bar-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b84a3a" />
          <stop offset="100%" stopColor="#8f3a2e" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {tryOnTicks.map((tick) => {
        const y = yTryOn(tick);
        return (
          <line
            key={`g-${tick}`}
            className="insights-combo-grid"
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y}
            y2={y}
          />
        );
      })}

      {/* Bars */}
      {buckets.map((bucket, i) => {
        const x = xCenter(i) - barWidth / 2;
        const y = yTryOn(bucket.tryOns);
        const h = Math.max(bucket.tryOns > 0 ? 2 : 0, PAD.top + PLOT_H - y);
        return (
          <rect
            key={bucket.key}
            className="insights-combo-bar"
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={2}
            fill={`url(#bar-${gradId})`}
          >
            <title>
              {bucket.label}: {bucket.tryOns} try-on
              {bucket.tryOns === 1 ? '' : 's'}, {bucket.conversionRate}%
              conversion
            </title>
          </rect>
        );
      })}

      {/* Conversion line + points */}
      {n > 0 ? (
        <polyline
          className="insights-combo-line"
          fill="none"
          points={linePoints}
        />
      ) : null}
      {buckets.map((bucket, i) => (
        <circle
          key={`pt-${bucket.key}`}
          className="insights-combo-point"
          cx={xCenter(i)}
          cy={yConv(bucket.conversionRate)}
          r={3.5}
        >
          <title>
            {bucket.label}: {bucket.conversionRate}% conversion
          </title>
        </circle>
      ))}

      {/* Left axis: try-ons */}
      {tryOnTicks.map((tick) => (
        <text
          key={`tl-${tick}`}
          className="insights-combo-tick insights-combo-tick--tryons"
          x={PAD.left - 8}
          y={yTryOn(tick) + 3}
          textAnchor="end"
        >
          {formatTick(tick, false)}
        </text>
      ))}
      <text
        className="insights-combo-axis-label insights-combo-axis-label--tryons"
        x={14}
        y={PAD.top + PLOT_H / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${PAD.top + PLOT_H / 2})`}
      >
        Try-ons
      </text>

      {/* Right axis: conversion % */}
      {convTicks.map((tick) => (
        <text
          key={`cl-${tick}`}
          className="insights-combo-tick insights-combo-tick--conv"
          x={WIDTH - PAD.right + 8}
          y={yConv(tick) + 3}
          textAnchor="start"
        >
          {formatTick(tick, true)}
        </text>
      ))}
      <text
        className="insights-combo-axis-label insights-combo-axis-label--conv"
        x={WIDTH - 12}
        y={PAD.top + PLOT_H / 2}
        textAnchor="middle"
        transform={`rotate(90 ${WIDTH - 12} ${PAD.top + PLOT_H / 2})`}
      >
        % Conversion
      </text>

      {/* X labels — the last bucket always gets one; skip modulo labels that
          would crowd it. */}
      {buckets.map((bucket, i) =>
        i === n - 1 || (i % labelEvery === 0 && n - 1 - i >= labelEvery) ? (
          <text
            key={`xl-${bucket.key}`}
            className="insights-combo-tick insights-combo-tick--x"
            x={xCenter(i)}
            y={HEIGHT - 10}
            textAnchor="middle"
          >
            {bucket.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export function TryOnVolumeChart({
  rows,
  period,
  onPeriodChange,
}: {
  rows: SurveyCInsightRow[];
  period: InsightsPeriod;
  onPeriodChange: (period: InsightsPeriod) => void;
}) {
  const series = useMemo(() => volumeOverTime(rows, period), [rows, period]);
  const hasData = series.buckets.some((b) => b.tryOns > 0);

  return (
    <div className="insights-panel insights-panel--wide insights-combo">
      <div className="insights-combo-head">
        <div>
          <h3 className="insights-panel-title">Try-on volume over time</h3>
          <p className="insights-panel-desc insights-combo-desc">
            Bars show fitting-room try-ons; the line tracks conversion rate in
            the same buckets.
          </p>
        </div>
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          ariaLabel="Chart time period"
        />
      </div>

      {hasData ? (
        <ComboSvg key={period} series={series} />
      ) : (
        <p className="insights-combo-empty">
          No try-ons in this period yet.
        </p>
      )}

      <div className="insights-combo-legend" aria-hidden="true">
        <span className="insights-combo-legend-item insights-combo-legend-item--bars">
          Try-ons
        </span>
        <span className="insights-combo-legend-item insights-combo-legend-item--line">
          Conversion %
        </span>
      </div>
    </div>
  );
}
