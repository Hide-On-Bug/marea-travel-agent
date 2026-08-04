import { ConnectionStatus, DirectLine, type Activity } from "botframework-directlinejs";
import { agentToUiEventSchema } from "@/lib/agent/eventSchemas";
import {
  mapDirectLineActivityToAgentEvent,
  mapDirectLineEventActivityToAgentEvent,
  isOwnUserMessage,
} from "@/lib/agent/directLineAdapters";
import { copilotTokenResponseSchema } from "@/lib/agent/tokenSchemas";
import type {
  AgentConnectionStatus,
  AgentConnectionStatusListener,
  AgentTransport,
  AgentEventListener,
} from "./AgentTransport";
import type { UiToAgentEvent } from "./eventTypes";

const DEFAULT_DIRECT_LINE_DOMAIN = "https://europe.directline.botframework.com/v3/directline";

export class DirectLineTransport implements AgentTransport {
  private directLine: DirectLine | null = null;
  private listeners = new Set<AgentEventListener>();
  private statusListeners = new Set<AgentConnectionStatusListener>();
  private activitySubscription: { unsubscribe: () => void } | null = null;
  private statusSubscription: { unsubscribe: () => void } | null = null;
  private userId = `web-${crypto.randomUUID()}`;
  private connectionStatus: AgentConnectionStatus = "disconnected";
  private lastConversationId: string | null = null;
  private connectedReady = false;
  private reconnecting = false;
  private localClientActivityIds = new Set<string>();

  async connect(): Promise<void> {
    await this.initializeDirectLine();
  }

  private async initializeDirectLine(): Promise<void> {
    this.emitConnectionStatus("connecting");
    this.connectedReady = false;

    const response = await fetch("/api/copilot/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      this.emitConnectionStatus("failed");
      throw new Error(`Token endpoint request failed with ${response.status}.`);
    }

    const json = await response.json();
    const tokenPayload = copilotTokenResponseSchema.parse(json);
    this.lastConversationId = tokenPayload.conversationId;
    const directLineDomain =
      process.env.NEXT_PUBLIC_DIRECT_LINE_DOMAIN?.trim() || DEFAULT_DIRECT_LINE_DOMAIN;

    this.activitySubscription?.unsubscribe();
    this.statusSubscription?.unsubscribe();
    this.activitySubscription = null;
    this.statusSubscription = null;

    if (this.directLine) {
      this.directLine.end();
      this.directLine = null;
    }

    this.directLine = new DirectLine({
      token: tokenPayload.token,
      domain: directLineDomain,
      webSocket: true,
      conversationStartProperties: {
        locale: "es-ES",
      },
    });

    this.statusSubscription = this.directLine.connectionStatus$.subscribe({
      next: (status) => {
        this.handleDirectLineConnectionStatus(status);
      },
      error: (error: unknown) => {
        this.logDirectLineError("connectionStatus$", error);
        this.emitConnectionStatus("failed");
      },
    });

    this.activitySubscription = this.directLine.activity$.subscribe({
      next: (activity) => {
        this.handleActivity(activity);
      },
      error: (error: unknown) => {
        this.logDirectLineError("activity$", error);
        this.emitConnectionStatus("failed");
      },
    });

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Direct Line connection timeout."));
      }, 12000);

      const waitSubscription = this.directLine?.connectionStatus$.subscribe({
        next: (status) => {
          if (status === ConnectionStatus.Online) {
            clearTimeout(timeoutId);
            this.connectedReady = true;
            waitSubscription?.unsubscribe();
            resolve();
          }

          if (
            status === ConnectionStatus.FailedToConnect ||
            status === ConnectionStatus.Ended ||
            status === ConnectionStatus.ExpiredToken
          ) {
            clearTimeout(timeoutId);
            this.connectedReady = false;
            waitSubscription?.unsubscribe();
            reject(new Error(`Direct Line failed with status ${status}.`));
          }
        },
        error: () => {
          clearTimeout(timeoutId);
          this.connectedReady = false;
          waitSubscription?.unsubscribe();
          reject(new Error("Direct Line status stream failed."));
        },
      });
    });
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.directLine || !this.connectedReady || this.connectionStatus !== "online") {
      await this.reconnectWithFreshToken();
    }

    if (!this.directLine || !this.connectedReady || this.connectionStatus !== "online") {
      throw new Error("DirectLineTransport is not online.");
    }

    const activity: Activity = {
      type: "message",
      from: { id: this.userId, name: "Usuario" },
      text,
      locale: "es-ES",
      channelData: {
        clientActivityId: crypto.randomUUID(),
      },
    };

    const clientActivityId = this.extractClientActivityId(activity);
    if (clientActivityId) {
      this.localClientActivityIds.add(clientActivityId);
    }

    const directLine = this.directLine;
    try {
      await new Promise<void>((resolve, reject) => {
        const subscription = directLine.postActivity(activity).subscribe({
          next: () => {
            subscription.unsubscribe();
            resolve();
          },
          error: (error: unknown) => {
            subscription.unsubscribe();
            reject(error);
          },
        });
      });
    } catch (error) {
      this.logDirectLineError("postActivity", error);
      await this.reconnectWithFreshToken();

      if (!this.directLine || !this.connectedReady || this.connectionStatus !== "online") {
        throw new Error("DirectLineTransport failed to reconnect.");
      }

      await new Promise<void>((resolve, reject) => {
        const retrySubscription = this.directLine?.postActivity(activity).subscribe({
          next: () => {
            retrySubscription?.unsubscribe();
            resolve();
          },
          error: (error: unknown) => {
            this.logDirectLineError("postActivity.retry", error);
            retrySubscription?.unsubscribe();
            reject(error);
          },
        });
      });
    }
  }

  private async reconnectWithFreshToken(): Promise<void> {
    if (this.reconnecting) {
      return;
    }

    this.reconnecting = true;
    this.emitConnectionStatus("reconnecting");

    try {
      await this.initializeDirectLine();
    } catch {
      this.emitConnectionStatus("failed");
      throw new Error("Unable to refresh Direct Line connection.");
    } finally {
      this.reconnecting = false;
    }
  }

  async sendEvent(event: UiToAgentEvent): Promise<void> {
    if (!this.directLine || !this.connectedReady || this.connectionStatus !== "online") {
      throw new Error("DirectLineTransport is not connected.");
    }

    let activityName: string;
    let activityValue: unknown;

    switch (event.type) {
      case "ui.datesSelected":
        activityName = "ui.datesSelected";
        activityValue = {
          departureDate: event.payload.fromDate,
          returnDate: event.payload.toDate,
          origin: event.payload.origin,
          destination: event.payload.destination,
        };
        break;
      case "ui.travelPartySelected":
        activityName = "ui.travelPartySelected";
        activityValue = event.payload;
        break;
      case "ui.cabinSelected":
        activityName = "ui.cabinSelected";
        activityValue = event.payload;
        break;
      default:
        return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[DirectLineTransport] Sending event: ${activityName}`, activityValue);
    }

    const activity = {
      type: "event",
      name: activityName,
      from: { id: this.userId, name: "Usuario", role: "user" },
      value: activityValue,
      locale: "es-ES",
    } as Activity;

    if (activityName === "ui.cabinSelected") {
      console.debug("[ui.cabinSelected]", {
        type: activity.type,
        name: activityName,
        value: event.payload,
      });
    }

    const directLine = this.directLine;
    await new Promise<void>((resolve, reject) => {
      const subscription = directLine.postActivity(activity).subscribe({
        next: () => {
          subscription.unsubscribe();
          resolve();
        },
        error: (error: unknown) => {
          this.logDirectLineError("sendEvent.postActivity", error);
          subscription.unsubscribe();
          reject(error);
        },
      });
    });
  }

  subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeConnectionStatus(listener: AgentConnectionStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  async disconnect(): Promise<void> {
    this.activitySubscription?.unsubscribe();
    this.statusSubscription?.unsubscribe();
    this.activitySubscription = null;
    this.statusSubscription = null;

    if (this.directLine) {
      this.directLine.end();
      this.directLine = null;
    }

    this.emitConnectionStatus("disconnected");
    this.lastConversationId = null;
    this.connectedReady = false;
    this.localClientActivityIds.clear();
    this.listeners.clear();
    this.statusListeners.clear();
    return;
  }

  private emitConnectionStatus(status: AgentConnectionStatus): void {
    if (this.connectionStatus === status) {
      return;
    }

    this.connectionStatus = status;
    if (status !== "online") {
      this.connectedReady = false;
    }
    this.statusListeners.forEach((listener) => listener(status));
  }

  private handleDirectLineConnectionStatus(status: ConnectionStatus): void {
    if (status === ConnectionStatus.Connecting) {
      this.emitConnectionStatus(
        this.connectionStatus === "online" ? "reconnecting" : "connecting",
      );
      return;
    }

    if (status === ConnectionStatus.Online) {
      this.emitConnectionStatus("online");
      return;
    }

    if (status === ConnectionStatus.ExpiredToken) {
      this.emitConnectionStatus("expired");
      return;
    }

    if (status === ConnectionStatus.FailedToConnect) {
      this.emitConnectionStatus("failed");
      return;
    }

    if (status === ConnectionStatus.Uninitialized || status === ConnectionStatus.Ended) {
      // Direct Line can briefly bounce through Uninitialized/Ended while establishing the socket.
      // Ignore those transient states once connect() has already moved us into connecting/reconnecting.
      if (this.connectionStatus === "connecting" || this.connectionStatus === "reconnecting") {
        return;
      }

      this.emitConnectionStatus("disconnected");
    }
  }

  private handleActivity(activity: Activity): void {
    if (isOwnUserMessage(activity, this.userId)) {
      return;
    }

    if (this.isLocalEcho(activity)) {
      return;
    }

    // Actividades de tipo "event" (ui.showDatePicker, etc.) — no mostrar como mensaje
    if (activity.type === "event") {
      if (process.env.NODE_ENV === "development") {
        console.log(`[DirectLineTransport] Event activity received: name="${activity.name}"`);
      }

      const mappedEvent = mapDirectLineEventActivityToAgentEvent(activity);
      if (!mappedEvent) {
        return;
      }

      const parsedEvent = agentToUiEventSchema.safeParse(mappedEvent);
      if (!parsedEvent.success) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[DirectLineTransport] Event schema validation failed", {
            issues: parsedEvent.error.issues,
          });
        }
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[DirectLineTransport] Event validated and emitted: ${parsedEvent.data.type}`);
      }

      this.listeners.forEach((listener) => listener(parsedEvent.data));
      return;
    }

    // Actividades de tipo "message"
    const mappedEvent = mapDirectLineActivityToAgentEvent(activity);
    if (!mappedEvent) {
      return;
    }

    const parsedEvent = agentToUiEventSchema.safeParse(mappedEvent);
    if (!parsedEvent.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[DirectLineTransport] Ignored invalid mapped event", {
          issues: parsedEvent.error.issues,
        });
      }
      return;
    }

    const safeEvent = parsedEvent.data;
    this.listeners.forEach((listener) => listener(safeEvent));
  }

  private logDirectLineError(context: string, error: unknown): void {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const details = this.extractErrorDetails(error);
    console.error("[DirectLineTransport]", context, details);
  }

  private extractErrorDetails(error: unknown): {
    status: number | null;
    message: string;
    body: string | null;
  } {
    const fallback = {
      status: null,
      message: error instanceof Error ? error.message : String(error),
      body: null,
    };

    if (!this.isRecord(error)) {
      return fallback;
    }

    const status = this.toNumber(error.status) ?? this.toNumber(error.statusCode);
    const message =
      this.toString(error.message) ?? this.toString(error.error) ?? fallback.message;
    const rawBody = error.body ?? error.responseText ?? error.response;
    const body = this.sanitizeBody(rawBody);

    return { status: status ?? null, message, body };
  }

  private sanitizeBody(rawBody: unknown): string | null {
    if (rawBody == null) {
      return null;
    }

    const bodyText = this.toString(rawBody) ?? JSON.stringify(rawBody);
    if (!bodyText) {
      return null;
    }

    return bodyText
      .replace(/("token"\s*:\s*")([^"]+)(")/gi, '$1***$3')
      .replace(/(token=)([^&\s]+)/gi, "$1***");
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toString(value: unknown): string | null {
    if (typeof value === "string") {
      return value;
    }

    return null;
  }

  private extractClientActivityId(activity: Activity): string | null {
    const channelData = activity.channelData;
    if (!channelData || typeof channelData !== "object") {
      return null;
    }

    const maybeId = (channelData as Record<string, unknown>).clientActivityId;
    return typeof maybeId === "string" ? maybeId : null;
  }

  private isLocalEcho(activity: Activity): boolean {
    const clientActivityId = this.extractClientActivityId(activity);
    if (!clientActivityId) {
      return false;
    }

    const isEcho = this.localClientActivityIds.has(clientActivityId);
    if (isEcho) {
      this.localClientActivityIds.delete(clientActivityId);
    }

    return isEcho;
  }
}
