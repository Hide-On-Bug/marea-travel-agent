import type {
  AgentConnectionStatus,
  AgentConnectionStatusListener,
  AgentTransport,
  AgentEventListener,
} from "./AgentTransport";
import {
  agentToUiEventSchema,
  uiToAgentEventSchema,
} from "@/lib/agent/eventSchemas";
import type {
  AgentToUiEvent,
  FlightOption,
  UiToAgentEvent,
} from "@/lib/agent/eventTypes";
import { romeFlights } from "@/lib/mocks";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const formatDate = (isoDate: string) => isoDate;
const DEMO_NEXT_FERRY_DATE = "2026-08-31";

const parseDestinationFromMessage = (text: string): string => {
  const normalized = text.trim();
  const match = normalized.match(/\ba\s+([\p{L}\s]+?)(?:\s+el\s+|\.|,|$)/iu);
  const destination = match?.[1]?.trim();
  if (!destination) {
    return "Ibiza";
  }

  return destination.charAt(0).toUpperCase() + destination.slice(1).toLowerCase();
};

export class MockAgentTransport implements AgentTransport {
  private listeners = new Set<AgentEventListener>();
  private statusListeners = new Set<AgentConnectionStatusListener>();
  private connected = false;
  private connectionStatus: AgentConnectionStatus = "disconnected";
  private pendingFlights: FlightOption[] = [];

  async connect(): Promise<void> {
    this.emitConnectionStatus("connecting");
    this.connected = true;
    this.emitConnectionStatus("online");
    this.emit({
      type: "ui.showMessage",
      payload: {
        text: "Hola. Soy tu Nauta de viajes. Cuéntame tu próximo destino.",
      },
    });
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Transport is not connected.");
    }

    const destination = parseDestinationFromMessage(text);
    this.pendingFlights = [...romeFlights];

    await delay(250);
    this.emit({
      type: "ui.showMessage",
      payload: {
        text: `Perfecto. El proximo ferry disponible para ${destination} es el ${DEMO_NEXT_FERRY_DATE}. Te muestro opciones ahora mismo.`,
      },
    });

    await delay(250);
    this.emit({
      type: "ui.showFlights",
      payload: {
        destination,
        fromDate: DEMO_NEXT_FERRY_DATE,
        toDate: DEMO_NEXT_FERRY_DATE,
        flights: this.pendingFlights,
      },
    });
    return;
  }

  async sendEvent(event: UiToAgentEvent): Promise<void> {
    if (!this.connected) {
      throw new Error("Transport is not connected.");
    }

    const validEvent = uiToAgentEventSchema.parse(event);

    if (validEvent.type === "ui.datesSelected") {
      this.pendingFlights = [...romeFlights];
      await delay(600);
      this.emit({
        type: "ui.showFlights",
        payload: {
          destination: validEvent.payload.destination,
          fromDate: formatDate(validEvent.payload.fromDate),
          toDate: formatDate(validEvent.payload.toDate),
          flights: this.pendingFlights,
        },
      });
      return;
    }

    if (validEvent.type === "ui.flightSelected") {
      const selectedFlight = this.pendingFlights.find(
        (flight) => flight.id === validEvent.payload.flightId,
      );
      if (selectedFlight) {
        this.emit({
          type: "ui.showMessage",
          payload: {
            text: `Vuelo ${selectedFlight.id} (${selectedFlight.airline}) seleccionado por ${selectedFlight.priceEur} EUR.`,
          },
        });
      }
      return;
    }
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
    this.connected = false;
    this.listeners.clear();
    this.emitConnectionStatus("disconnected");
    this.statusListeners.clear();
  }

  private emit(event: AgentToUiEvent): void {
    const safeEvent = agentToUiEventSchema.parse(event);
    this.listeners.forEach((listener) => listener(safeEvent));
  }

  private emitConnectionStatus(status: AgentConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
