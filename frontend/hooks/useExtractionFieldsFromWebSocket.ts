import { useEffect, useMemo, useState } from "react";

import { useExtractionWebSocket } from "./useExtractionWebSocket";

const aliasGroups: Array<[string, string]> = [
  ["invoice_number", "invoice_no"],
  ["vendor_name", "vendor"],
  ["invoice_total", "amount"],
];

const orderedKeys = [
  "invoice_no",
  "vendor",
  "amount",
  "date",
  "gstin",
  "status",
];

function normalizeToFieldsMap(extraction: any): Record<string, any> {
  if (!extraction || typeof extraction !== "object") return {};

  // Preferred shape: { fields: { invoice_no: {value,confidence}, ... } }
  if (extraction.fields && typeof extraction.fields === "object") {
    return extraction.fields;
  }

  // Some endpoints return fields directly: { invoice_no: {...}, ... }
  return extraction;
}

function buildOrderedFields(extraction: any) {
  const fieldsObj = normalizeToFieldsMap(extraction);

  const usedAliases = new Set<string>();

  const extractionKeys = [
    ...orderedKeys.filter((key) => {
      const exists = Object.prototype.hasOwnProperty.call(fieldsObj, key);
      if (exists) return true;

      // if a legacy alias maps to an ordered key, allow it
      const alias = aliasGroups.find((g) => g.includes(key))
        ?.find((a) => a !== key);
      if (alias && Object.prototype.hasOwnProperty.call(fieldsObj, alias)) {
        if (usedAliases.has(alias)) return false;
        usedAliases.add(alias);
        return true;
      }

      return false;
    }),
  ];

  return extractionKeys.map((key) => {
    const direct = fieldsObj?.[key];

    // legacy support
    const alias = aliasGroups.find((g) => g.includes(key))?.find(
      (a) => a !== key
    );
    const mapped = alias ? fieldsObj?.[alias] : undefined;

    const f = direct || mapped || {};

    return {
      name: key.replace(/_/g, " ").toUpperCase(),
      value: f?.value ?? "",
      confidence: f?.confidence ?? 0,
    };
  });
}

export function useExtractionFieldsFromWebSocket({
  documentId,
  token,
  enabled,
}: {
  documentId: string | null;
  token: string | null;
  enabled: boolean;
}): {
  connected: boolean;
  fields: any[];
  isReady: boolean;
  error: string | null;
} {
  const { connected, extraction, error } = useExtractionWebSocket({
    documentId,
    token,
    enabled,
  });

  const [isReady, setIsReady] = useState(false);
  const fields = useMemo(() => {
    if (!extraction) return [];
    return buildOrderedFields(extraction);
  }, [extraction]);

  useEffect(() => {
    setIsReady(!!(enabled && extraction));
  }, [enabled, extraction]);


  return { connected, fields, isReady, error };
}

