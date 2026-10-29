/**
 * Thin wrapper around the WebSocket connection to
 * `/ws/sections/{id}/collab/`. Speaks the exact protocol implemented in
 * `realtime/consumers.py`: "init" on connect, "submit"/"steps"/"catch_up"
 * after that. This class knows nothing about ProseMirror — it just moves
 * JSON messages back and forth and exposes callbacks. `useCollabEditor`
 * is what actually applies the steps to an editor.
 */

export interface InitMessage {
  type: "init";
  version: number;
}

export interface StepsMessage {
  type: "steps";
  version: number;
  steps: unknown[];
  client_ids: string[];
}

export interface ErrorMessage {
  type: "error";
  detail: string;
}

export type CollabServerMessage = InitMessage | StepsMessage | ErrorMessage;

export interface CollabSocketOptions {
  sectionId: string;
  token: string;
  wsBaseUrl?: string;
  onInit: (version: number) => void;
  onSteps: (version: number, steps: unknown[], clientIds: string[]) => void;
  onError: (detail: string) => void;
  onClose?: (code: number) => void;
}

const DEFAULT_WS_BASE =
  (import.meta.env.VITE_WS_BASE_URL as string | undefined) ?? "ws://localhost:8000";

export class CollabSocket {
  private ws: WebSocket | null = null;
  private readonly options: CollabSocketOptions;

  constructor(options: CollabSocketOptions) {
    this.options = options;
  }

  connect(): void {
    const base = this.options.wsBaseUrl ?? DEFAULT_WS_BASE;
    const url = `${base}/ws/sections/${this.options.sectionId}/collab/?token=${encodeURIComponent(this.options.token)}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event: MessageEvent<string>) => {
      let message: CollabServerMessage;
      try {
        message = JSON.parse(event.data);
      } catch {
        this.options.onError("Received malformed message from server.");
        return;
      }

      switch (message.type) {
        case "init":
          this.options.onInit(message.version);
          break;
        case "steps":
          this.options.onSteps(message.version, message.steps, message.client_ids);
          break;
        case "error":
          this.options.onError(message.detail);
          break;
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.options.onClose?.(event.code);
    };
  }

  submitSteps(version: number, steps: unknown[], clientId: string): void {
    this.send({ type: "submit", version, steps, client_id: clientId });
  }

  requestCatchUp(fromVersion: number): void {
    this.send({ type: "catch_up", version: fromVersion });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}
