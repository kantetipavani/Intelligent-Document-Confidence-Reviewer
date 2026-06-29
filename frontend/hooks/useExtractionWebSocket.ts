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


