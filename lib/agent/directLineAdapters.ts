import type { Activity } from "botframework-directlinejs";
import type { AgentToUiEvent } from "@/lib/agent/eventTypes";
import {
  showDatePickerActivityValueSchema,
  showTravelPartySelectorActivityValueSchema,
  showCabinSelectorActivityValueSchema,
  showQuickOptionsActivityValueSchema,
} from "@/lib/agent/eventSchemas";

const MAX_AGENT_MESSAGE_LENGTH = 4000;

const truncateText = (value: string): string => {
  if (value.length <= MAX_AGENT_MESSAGE_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_AGENT_MESSAGE_LENGTH - 3)}...`;
};

export const isOwnUserMessage = (activity: Activity, userId: string): boolean => {
  if (activity.type !== "message") {
    return false;
  }

  if (activity.from?.id === userId) {
    return true;
  }

  return activity.from?.role === "user";
};

export const mapDirectLineActivityToAgentEvent = (
  activity: Activity,
): AgentToUiEvent | null => {
  if (activity.type !== "message") {
    return null;
  }

  // In Direct Line streams we can receive echoes of user messages.
  // Only map bot-originated messages to the chat as agent replies.
  if (activity.from?.role && activity.from.role !== "bot") {
    return null;
  }

  const text = activity.text?.trim();
  if (!text) {
    return null;
  }

  return {
    type: "ui.showMessage",
    payload: {
      text: truncateText(text),
    },
  };
};

/**
 * Parsea el value de una actividad DirectLine que puede llegar como objeto
 * o como string en formato Power FX (claves sin comillas).
 * Devuelve undefined si no se puede parsear.
 */
const parseActivityValue = (raw: unknown): unknown => {
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { /* intenta normalizar */ }
  try {
    return JSON.parse(raw.replace(/(\b[a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":'));
  } catch { return undefined; }
};

/**
 * Mapea actividades DirectLine de tipo "event" a eventos UI tipados.
 * Solo procesa eventos cuyo name tenga contrato definido.
 * No emite mensajes al chat.
 */
export const mapDirectLineEventActivityToAgentEvent = (
  activity: Activity,
): AgentToUiEvent | null => {
  if (activity.type !== "event") {
    return null;
  }

  // Copilot Studio puede prefijar el nombre con "Name: " — lo normalizamos
  const rawName = activity.name ?? "";
  const eventName = rawName.startsWith("Name: ") ? rawName.slice(6) : rawName;

  if (process.env.NODE_ENV === "development") {
    console.log(`[directLineAdapters] Event activity received: name="${eventName}"${rawName !== eventName ? ` (raw: "${rawName}")` : ""}`);
  }

  if (eventName === "ui.showDatePicker") {
    const rawValue = parseActivityValue(activity.value);
    if (rawValue === undefined) {
      if (process.env.NODE_ENV === "development") console.warn("[directLineAdapters] ui.showDatePicker: no se pudo parsear value");
      return null;
    }

    const parsed = showDatePickerActivityValueSchema.safeParse(rawValue);

    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[directLineAdapters] ui.showDatePicker validation failed", {
          value: JSON.stringify(rawValue),
          issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      }
      return null;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[directLineAdapters] ui.showDatePicker validated:", {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        minDate: parsed.data.minDate,
      });
    }

    return {
      type: "ui.showDatePicker",
      payload: {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        minDate: parsed.data.minDate,
        mode: parsed.data.mode,
      },
    };
  }

  if (eventName === "ui.showTravelPartySelector") {
    const rawValue = parseActivityValue(activity.value);
    if (rawValue === undefined) return null;
    const parsed = showTravelPartySelectorActivityValueSchema.safeParse(rawValue);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[directLineAdapters] ui.showTravelPartySelector validation failed", {
          issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      }
      return null;
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[directLineAdapters] ui.showTravelPartySelector validated:", parsed.data);
    }
    return { type: "ui.showTravelPartySelector", payload: parsed.data };
  }

  if (eventName === "ui.showCabinSelector") {
    const rawValue = parseActivityValue(activity.value);
    if (rawValue === undefined) return null;
    const parsed = showCabinSelectorActivityValueSchema.safeParse(rawValue);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[directLineAdapters] ui.showCabinSelector validation failed", {
          issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      }
      return null;
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[directLineAdapters] ui.showCabinSelector validated:", parsed.data);
    }
    return { type: "ui.showCabinSelector", payload: parsed.data };
  }

  if (eventName === "ui.showQuickOptions") {
    const rawValue = parseActivityValue(activity.value);
    if (rawValue === undefined) return null;
    const parsed = showQuickOptionsActivityValueSchema.safeParse(rawValue);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[directLineAdapters] ui.showQuickOptions validation failed", {
          issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      }
      return null;
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[directLineAdapters] ui.showQuickOptions validated:", parsed.data);
    }
    return { type: "ui.showQuickOptions", payload: parsed.data };
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[directLineAdapters] Unhandled event name: "${eventName}" — ignored`);
  }

  return null;
};