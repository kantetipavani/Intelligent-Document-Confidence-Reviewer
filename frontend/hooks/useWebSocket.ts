import { useEffect, useRef, useState } from "react";

export type WebSocketMessageHandler<T = any> = (event: T) => void;

type UseWebSocketOptions = {
  url: string;
  token?: string;
  onMessage: WebSocketMessageHandler;
  onOpen?: () => void;
  onError?: (err: unknown) => void;
  maxReconnectAttempts?: number; // default 3
  initialBackoffMs?: number; // default 500
};

export function useWebSocket({
  url,
  token,
  onMessage,
  onOpen,
  onError,
  maxReconnectAttempts = 3,
  initialBackoffMs = 500,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const backoffRef = useRef(initialBackoffMs);
  const shouldCloseRef = useRef(false);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    shouldCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    backoffRef.current = initialBackoffMs;

    const finalUrl = token ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : url;

    const connect = () => {
      if (shouldCloseRef.current) return;

      const ws = new WebSocket(finalUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        backoffRef.current = initialBackoffMs;
        onOpen?.();
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          onMessage(data);
        } catch {
          // if backend sends raw strings
          onMessage(evt.data as any);
        }
      };

      ws.onerror = (err) => {
        setConnected(false);
        onError?.(err);
      };

      ws.onclose = () => {
        setConnected(false);
        if (shouldCloseRef.current) return;

        const attempts = reconnectAttemptsRef.current;
        if (attempts >= maxReconnectAttempts) return;

        reconnectAttemptsRef.current += 1;
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, 8000);

        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      shouldCloseRef.current = true;
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  return { connected };
}

