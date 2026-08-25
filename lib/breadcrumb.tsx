"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BreadcrumbContextValue = {
  /** Human label for the current detail page (overrides raw Firestore id in the header). */
  detailLabel: string | null;
  setDetailLabel: (label: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [detailLabel, setDetailLabelState] = useState<string | null>(null);
  const setDetailLabel = useCallback((label: string | null) => {
    setDetailLabelState(label);
  }, []);
  const value = useMemo(
    () => ({ detailLabel, setDetailLabel }),
    [detailLabel, setDetailLabel]
  );
  return (
    <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbLabel() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    return {
      detailLabel: null as string | null,
      setDetailLabel: (_label: string | null) => {},
    };
  }
  return ctx;
}

/** Looks like a Firestore auto-id (20 chars, alphanumeric). */
export function looksLikeFirestoreId(segment: string): boolean {
  return /^[A-Za-z0-9]{16,28}$/.test(segment);
}

/**
 * Build a readable breadcrumb from the admin pathname.
 * Replaces raw Firestore ids with `detailLabel` when provided.
 */
export function formatAdminBreadcrumb(
  pathname: string,
  detailLabel?: string | null
): string {
  const parts = pathname.split("/").filter(Boolean).slice(1); // drop "admin"
  if (!parts.length) return "Dashboard";

  const labels = parts.map((part, i) => {
    const isLast = i === parts.length - 1;
    if (isLast && detailLabel && looksLikeFirestoreId(part)) {
      return detailLabel;
    }
    if (looksLikeFirestoreId(part)) {
      return detailLabel && isLast ? detailLabel : "Details";
    }
    return part.replace(/-/g, " ");
  });

  return labels.join(" › ");
}
