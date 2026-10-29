import { useEffect, useRef, useState } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Step } from "prosemirror-transform";
import { collab, receiveTransaction, sendableSteps, getVersion } from "prosemirror-collab";
import { exampleSetup } from "prosemirror-example-setup";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";

import { collabSchema, docToHTML, htmlToDoc } from "./serialization";
import { CollabSocket } from "./socket";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface UseCollabEditorOptions {
  sectionId: string;
  token: string;
  initialContentHTML: string;
  clientId: string;
  wsBaseUrl?: string;
}

export interface UseCollabEditorResult {
  editorRef: React.RefObject<HTMLDivElement | null>;
  status: ConnectionStatus;
  errorMessage: string | null;
  /** Serializes the live document to HTML — call this right before saving a new SectionVersion via REST. */
  getCurrentHTML: () => string;
}

/**
 * Owns the ProseMirror EditorView + collab plugin lifecycle and keeps it in
 * sync with the server over a CollabSocket. Implements the standard
 * prosemirror-collab client loop: on every local change, send whatever
 * `sendableSteps` reports (if nothing is already in flight); on every
 * incoming "steps" message, feed it through `receiveTransaction` — which
 * correctly no-ops the steps that were this client's own, already-applied
 * submission, and rebases genuinely-new remote steps on top of any
 * unconfirmed local edits.
 */
export function useCollabEditor(options: UseCollabEditorOptions): UseCollabEditorResult {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const socketRef = useRef<CollabSocket | null>(null);
  const sendingRef = useRef(false);

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const doc = htmlToDoc(options.initialContentHTML);

    const state = EditorState.create({
      doc,
      schema: collabSchema,
      plugins: [
        collab({ version: 0, clientID: options.clientId }),
        history(),
        keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
        ...exampleSetup({ schema: collabSchema, history: false }),
      ],
    });

    function maybeSend(view: EditorView) {
      if (sendingRef.current) return;
      const sendable = sendableSteps(view.state);
      if (!sendable) return;
      sendingRef.current = true;
      socketRef.current?.submitSteps(
        sendable.version,
        sendable.steps.map((s) => s.toJSON()),
        String(sendable.clientID),
      );
    }

    function dispatchTransaction(tr: Transaction) {
      const view = viewRef.current;
      if (!view) return;
      const newState = view.state.apply(tr);
      view.updateState(newState);
      maybeSend(view);
    }

    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction,
    });
    viewRef.current = view;

    const socket = new CollabSocket({
      sectionId: options.sectionId,
      token: options.token,
      wsBaseUrl: options.wsBaseUrl,
      onInit: (serverVersion) => {
        setStatus("connected");
        const localVersion = getVersion(view.state);
        if (serverVersion > localVersion) {
          socket.requestCatchUp(localVersion);
        }
      },
      onSteps: (_version, rawSteps, clientIds) => {
        sendingRef.current = false;
        const steps = rawSteps.map((s) => Step.fromJSON(collabSchema, s));
        const tr = receiveTransaction(view.state, steps, clientIds, { mapSelectionBackward: true });
        view.updateState(view.state.apply(tr));
        maybeSend(view);
      },
      onError: (detail) => {
        setErrorMessage(detail);
        setStatus("error");
      },
      onClose: () => {
        setStatus("disconnected");
      },
    });
    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.close();
      view.destroy();
      viewRef.current = null;
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.sectionId, options.token, options.clientId]);

  return {
    editorRef,
    status,
    errorMessage,
    getCurrentHTML: () => {
      const view = viewRef.current;
      if (!view) return options.initialContentHTML;
      return docToHTML(view.state.doc);
    },
  };
}
