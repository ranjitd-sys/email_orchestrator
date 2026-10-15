export class SendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SendError";
  }
}

export class TransientSendError extends SendError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TransientSendError";
  }
}


export class PermanentSendError extends SendError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PermanentSendError";
  }
}

export function classifyStatus(
  provider: string,
  status: number,
  detail: string,
): TransientSendError | PermanentSendError {
  const message = `${provider} send failed (${status}): ${detail}`;
  if (status === 429 || status >= 500) {
    return new TransientSendError(message);
  }
  return new PermanentSendError(message);
}
