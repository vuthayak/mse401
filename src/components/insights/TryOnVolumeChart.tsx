import {
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion } from 'motion/react';
import {
  volumeOverTime,
  type InsightsPeriod,
  type VolumeSeries,
} from '../../lib/storeInsights';
import type { SurveyCInsightRow } from '../../lib/fetchSurveyCInsights';
import { PeriodSelector } from './PeriodSelector';
import { SPRING } from './motion';

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

type HoverState = {
  index: number;
  clientX: number;
  clientY: number;
};

function ComboSvg({
  series,
  hoverIndex,
  onHover,
  onLeave,
}: {
  series: VolumeSeries;
  hoverIndex: number | null;
  onHover: (state: HoverState) => void;
  onLeave: () => void;
}) {
  const gradId = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const { buckets, maxTryOns, maxConversionRate } = series;
  const n = buckets.length;
  const slot = n === 0 ? PLOT_W : PLOT_W / n;
  const barWidth = Math.max(4, Math.min(44, slot * 0.78));

  const xCenter = (i: number) => PAD.left + slot * i + slot / 2;
  const yTryOn = (count: number) =>
    PAD.top + PLOT_H - (maxTryOns <= 0 ? 0 : (count / maxTryOns) * PLOT_H);
  const yConv = (rate: number) =>
    PAD.top +
    PLOT_H -
    (maxConversionRate <= 0 ? 0 : (rate / maxConversionRate) * PLOT_H);

  const tryOnTicks = countTicks(maxTryOns);
  const convTicks = yTicks(maxConversionRate);

  const labelEvery = n <= 8 ? 1 : n <= 16 ? 2 : Math.ceil(n / 8);

  const linePoints =
    n === 0
      ? ''
      : buckets
          .map((b, i) => `${xCenter(i)},${yConv(b.conversionRate)}`)
          .join(' ');

  function nearestIndex(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || n === 0) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const localX = (clientX - rect.left) * scaleX;
    if (localX < PAD.left || localX > WIDTH - PAD.right) return null;
    const idx = Math.min(
      n - 1,
      Math.max(0, Math.floor((localX - PAD.left) / slot)),
    );
    return idx;
  }

  function handlePointer(e: ReactPointerEvent<SVGSVGElement>) {
    const idx = nearestIndex(e.clientX);
    if (idx === null) {
      onLeave();
      return;
    }
    onHover({ index: idx, clientX: e.clientX, clientY: e.clientY });
  }

  return (
    <svg
      ref={svgRef}
      className="insights-combo-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Try-on volume bars with conversion rate line over time"
      onPointerMove={handlePointer}
      onPointerDown={handlePointer}
      onPointerLeave={onLeave}
    >
      <defs>
        <linearGradient id={`bar-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--insights-chart-bar-top, #b84a3a)" />
          <stop
            offset="100%"
            stopColor="var(--insights-chart-bar-bot, #8f3a2e)"
          />
        </linearGradient>
      </defs>

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

      {buckets.map((bucket, i) => {
        const x = xCenter(i) - barWidth / 2;
        const y = yTryOn(bucket.tryOns);
        const h = Math.max(bucket.tryOns > 0 ? 2 : 0, PAD.top + PLOT_H - y);
        const dim =
          hoverIndex !== null && hoverIndex !== i
            ? ' insights-combo-bar--dim'
            : hoverIndex === i
              ? ' insights-combo-bar--active'
              : '';
        return (
          <motion.rect
            key={bucket.key}
            className={`insights-combo-bar${dim}`}
            x={x}
            initial={false}
            animate={{ y, height: h }}
            transition={SPRING}
            width={barWidth}
            rx={2}
            fill={`url(#bar-${gradId})`}
          />
        );
      })}

      {n > 0 ? (
        <motion.polyline
          className="insights-combo-line"
          fill="none"
          initial={false}
          animate={{ points: linePoints }}
          transition={SPRING}
        />
      ) : null}

      {buckets.map((bucket, i) => (
        <motion.circle
          key={`pt-${bucket.key}`}
          className={
            hoverIndex !== null && hoverIndex !== i
              ? 'insights-combo-point insights-combo-point--dim'
              : 'insights-combo-point'
          }
          initial={false}
          animate={{
            cx: xCenter(i),
            cy: yConv(bucket.conversionRate),
          }}
          transition={SPRING}
          r={hoverIndex === i ? 4.5 : 3.5}
        />
      ))}

      {hoverIndex !== null && buckets[hoverIndex] ? (
        <line
          className="insights-combo-crosshair"
          x1={xCenter(hoverIndex)}
          x2={xCenter(hoverIndex)}
          y1={PAD.top}
          y2={PAD.top + PLOT_H}
        />
      ) : null}

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const tooltipBucket =
    hover && series.buckets[hover.index]
      ? series.buckets[hover.index]
      : null;

  const tooltipStyle = useMemo(() => {
    if (!hover || !wrapRef.current) return undefined;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = Math.min(
      Math.max(hover.clientX - rect.left, 72),
      rect.width - 72,
    );
    const y = Math.max(hover.clientY - rect.top, 24);
    return { left: x, top: y };
  }, [hover]);

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

      <div className="insights-combo-chart-wrap" ref={wrapRef}>
        {hasData ? (
          <ComboSvg
            series={series}
            hoverIndex={hover?.index ?? null}
            onHover={setHover}
            onLeave={() => setHover(null)}
          />
        ) : (
          <p className="insights-combo-empty">
            No try-ons in this period yet.
          </p>
        )}

        {tooltipBucket && tooltipStyle ? (
          <div
            className="insights-combo-tooltip"
            style={tooltipStyle}
            role="status"
          >
            <span className="insights-combo-tooltip-label">
              {tooltipBucket.label}
            </span>
            <div className="insights-combo-tooltip-row">
              <span>Try-ons</span>
              <strong>{tooltipBucket.tryOns}</strong>
            </div>
            <div className="insights-combo-tooltip-row">
              <span>Conversion</span>
              <strong>{tooltipBucket.conversionRate}%</strong>
            </div>
          </div>
        ) : null}
      </div>

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
