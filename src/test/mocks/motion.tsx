import {
  createElement,
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

type MotionProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

const MOTION_PROP_KEYS = new Set([
  'layoutId',
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'layout',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
]);

function stripMotionProps(props: MotionProps) {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!MOTION_PROP_KEYS.has(key)) rest[key] = value;
  }
  return rest;
}

function createMotionComponent(tag: string) {
  return forwardRef<HTMLElement, MotionProps>(function MotionComponent(
    props,
    ref,
  ) {
    return createElement(tag, { ...stripMotionProps(props), ref });
  });
}

export const motion = new Proxy(
  {} as Record<string, ReturnType<typeof createMotionComponent>>,
  {
    get(_target, prop: string) {
      return createMotionComponent(prop);
    },
  },
);

export function AnimatePresence({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function MotionConfig({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function createMotionValue(initial: unknown) {
  let current = initial;
  return {
    get: () => current,
    set: (next: unknown) => {
      current = next;
    },
    on: () => () => undefined,
    onChange: () => () => undefined,
  };
}

export function useSpring(value: unknown) {
  if (value && typeof value === 'object' && 'get' in (value as object)) {
    return value;
  }
  return createMotionValue(value);
}

export function useMotionValue(value: unknown) {
  return createMotionValue(value);
}

export function useTransform(
  value: unknown,
  inputOrMapper: unknown,
  output?: unknown,
) {
  const current =
    value && typeof value === 'object' && 'get' in (value as object)
      ? (value as { get: () => unknown }).get()
      : value;

  if (typeof inputOrMapper === 'function') {
    return (inputOrMapper as (v: unknown) => unknown)(current);
  }

  if (Array.isArray(output)) return output[0];
  return output ?? current ?? 0;
}

export type HTMLMotionProps<T extends keyof HTMLElementTagNameMap> =
  ComponentPropsWithoutRef<T>;
