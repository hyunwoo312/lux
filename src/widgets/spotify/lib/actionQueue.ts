export type QueuedRunner = (run: () => Promise<void>) => void;

export function createSerialQueue(): QueuedRunner {
  let tail: Promise<void> = Promise.resolve();

  return (run) => {
    tail = tail.then(run, run);
  };
}

export function createLatestOnly(): QueuedRunner {
  let running = false;
  let pending: (() => Promise<void>) | null = null;

  const drain = async (): Promise<void> => {
    running = true;
    try {
      while (pending) {
        const next = pending;
        pending = null;
        await next();
      }
    } finally {
      running = false;
    }
  };

  return (run) => {
    pending = run;
    if (!running) void drain();
  };
}
