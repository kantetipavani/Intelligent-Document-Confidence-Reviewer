import { useEffect, useRef, useState } from "react";

type ExtractionMessage = {
  type?: string;
  event?: string;
  status?: string;
  extraction?: any;
};

export type UseExtractionWebSocketResult = {
  connected: boolean;
  extraction: any | null;
  error: string | null;
};

function httpToWsUrl(httpUrl: string) {
  // supports http://host:port and https://host:port
  if (!httpUrl) return httpUrl;
  if (httpUrl.startsWith("https://")) return httpUrl.replace(/^https:\/\//, "wss://");
  if (httpUrl.startsWith("http://")) return httpUrl.replace(/^http:\/\//, "ws://");
  return httpUrl;
}

export function useExtractionWebSocket({
  documentId,
  token,
  enabled,
}: {
  documentId: string | null;
  token: string | null;
  enabled: boolean;
}): UseExtractionWebSocketResult {
  const [connected, setConnected] = useState(false);
  const [extraction, setExtraction] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !documentId) return;

    const apiBaseURL =
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000";

    const wsBase = httpToWsUrl(apiBaseURL);
    const wsUrl = `${wsBase}/ws/documents/${documentId}?token=${encodeURIComponent(token || "")}`;

    setConnected(false);
    setExtraction(null);
    setError(null);

    let settled = false;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (ev) => {
      try {
        const msg: ExtractionMessage = JSON.parse(ev.data);

        // Server sends:
        // { type: "document_status", status: "ready", extraction: {...} }
        const statusVal = msg?.status;
        const extractionPayload = msg?.extraction;

        const isReady =
          statusVal === "ready" ||
          statusVal === "completed" ||
          statusVal === "COMPLETE" ||
          msg?.event === "EXTRACTION_COMPLETE";

        if (extractionPayload && (isReady || statusVal)) {
          if (settled) return;
          settled = true;
          setExtraction(extractionPayload);
          ws.close();
          return;
        }

        // If envelope contains extraction directly under different field
        if (isReady && msg && (msg as any)?.result) {
          if (settled) return;
          settled = true;
          setExtraction((msg as any).result);
          ws.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      if (!settled) {
        setError("WebSocket error");
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      settled = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [documentId, token, enabled]);

  return { connected, extraction, error };
}

