import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ExportFn = () => void;

type InsightsExportContextValue = {
  /** True when the current page has registered an export handler. */
  canExport: boolean;
  registerExport: (fn: ExportFn | null) => void;
  runExport: () => void;
};

const InsightsExportContext = createContext<InsightsExportContextValue | null>(
  null,
);

export function InsightsExportProvider({ children }: { children: ReactNode }) {
  const [exportFn, setExportFn] = useState<ExportFn | null>(null);

  const registerExport = useCallback((fn: ExportFn | null) => {
    setExportFn(() => fn);
  }, []);

  const runExport = useCallback(() => {
    exportFn?.();
  }, [exportFn]);

  const value = useMemo(
    () => ({
      canExport: exportFn !== null,
      registerExport,
      runExport,
    }),
    [exportFn, registerExport, runExport],
  );

  return (
    <InsightsExportContext.Provider value={value}>
      {children}
    </InsightsExportContext.Provider>
  );
}

export function useInsightsExport(): InsightsExportContextValue {
  const ctx = useContext(InsightsExportContext);
  if (!ctx) {
    throw new Error(
      'useInsightsExport must be used within InsightsExportProvider',
    );
  }
  return ctx;
}

/** Register an export callback for the current page; clears on unmount. */
export function useRegisterInsightsExport(fn: ExportFn | null): void {
  const { registerExport } = useInsightsExport();

  useEffect(() => {
    registerExport(fn);
    return () => registerExport(null);
  }, [fn, registerExport]);
}
