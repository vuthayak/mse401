import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { InsightsExportProvider } from '../components/insights/InsightsExportContext';

type Options = Omit<RenderOptions, 'wrapper'> & {
  route?: string;
  routerProps?: MemoryRouterProps;
  withInsightsExport?: boolean;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    routerProps,
    withInsightsExport = false,
    ...options
  }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const tree = (
      <MemoryRouter
        initialEntries={routerProps?.initialEntries ?? [route]}
        {...routerProps}
      >
        {withInsightsExport ? (
          <InsightsExportProvider>{children}</InsightsExportProvider>
        ) : (
          children
        )}
      </MemoryRouter>
    );
    return tree;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
