/// <reference lib="webworker" />

import { findBestMove } from "./engine";
import type { AiRequest } from "./types";

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener("message", (event: MessageEvent<AiRequest>) => {
  const request = event.data;
  try {
    const result = findBestMove(request);
    scope.postMessage(result);
  } catch (error) {
    scope.postMessage({
      id: request.id,
      error: error instanceof Error ? error.message : "The engine stopped unexpectedly.",
    });
  }
});
