export type AgentToUiEventType =
  | "ui.showDatePicker"
  | "ui.showFlights"
  | "ui.showMessage"
  | "ui.showQuickOptions"
  | "ui.showTravelPartySelector"
  | "ui.showCabinSelector";

export type UiToAgentEventType =
  | "ui.datesSelected"
  | "ui.flightSelected"
  | "ui.travelPartySelected"
  | "ui.cabinSelected";

export interface FlightOption {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  priceEur: number;
}

export interface ShowDatePickerPayload {
  destination: string;
  hint?: string;
  origin?: string;
  minDate?: string;
  mode?: "range";
}

export interface ShowFlightsPayload {
  destination: string;
  fromDate: string;
  toDate: string;
  flights: FlightOption[];
}

export interface ShowMessagePayload {
  text: string;
}

export interface ShowQuickOptionsPayload {
  title?: string;
  options: string[];
}

export interface ShowTravelPartySelectorPayload {
  minPassengers: number;
  maxPassengers: number;
  defaultPassengers: number;
  allowPets: boolean;
}

export interface ShowCabinSelectorPayload {
  cabinId: string;
}

export interface DatesSelectedPayload {
  origin: string;
  destination: string;
  fromDate: string;
  toDate: string;
}

export interface FlightSelectedPayload {
  flightId: string;
}

export interface TravelPartySelectedPayload {
  passengers: number;
  hasPets: boolean;
}

export type CabinSelectedPayload = string;

export type AgentToUiEvent =
  | { type: "ui.showDatePicker"; payload: ShowDatePickerPayload }
  | { type: "ui.showFlights"; payload: ShowFlightsPayload }
  | { type: "ui.showMessage"; payload: ShowMessagePayload }
  | { type: "ui.showQuickOptions"; payload: ShowQuickOptionsPayload }
  | { type: "ui.showTravelPartySelector"; payload: ShowTravelPartySelectorPayload }
  | { type: "ui.showCabinSelector"; payload: ShowCabinSelectorPayload };

export type UiToAgentEvent =
  | { type: "ui.datesSelected"; payload: DatesSelectedPayload }
  | { type: "ui.flightSelected"; payload: FlightSelectedPayload }
  | { type: "ui.travelPartySelected"; payload: TravelPartySelectedPayload }
  | { type: "ui.cabinSelected"; payload: CabinSelectedPayload };

export interface ChatMessageModel {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  timestamp: string;
}
