type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(
  nextHandler: SessionExpiredHandler,
): () => void {
  handler = nextHandler;
  return () => {
    if (handler === nextHandler) handler = null;
  };
}

export function notifySessionExpired(): void {
  handler?.();
}
