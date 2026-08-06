export type AgentToUiEventType =
  | "ui.showDatePicker"
  | "ui.showFlights"
  | "ui.showCars"
  | "ui.showHotels"
  | "ui.showMessage"
  | "ui.showQuickOptions"
  | "ui.showTravelPartySelector"
  | "ui.showCabinSelector";

export type UiToAgentEventType =
  | "ui.datesSelected"
  | "ui.flightSelected"
  | "ui.travelPartySelected"
  | "ui.cabinSelected"
  | "ui.hotelSelected";

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

export interface CarOption {
  id: string;
  name: string;
  category: string;
  transmission: string;
  pricePerDayEur: number;
  imageSrc?: string;
  imageAlt?: string;
  seats?: number;
  fuel?: "Gasolina" | "Hibrido" | "Electrico";
  luggage?: number;
  petFriendly?: boolean;
  tags?: string[];
}

export interface ShowCarsPayload {
  destination: string;
  days: number;
  title?: string;
  cars: CarOption[];
}

export interface HotelOption {
  id: string;
  hotelName: string;
  roomName: string;
  stars?: number;
  board?: "Alojamiento" | "Desayuno incluido";
  cancellation?: "Flexible" | "No reembolsable";
  nightPriceEur: number;
  image?: {
    src: string;
    alt: string;
  };
  tags?: string[];
  features?: string[];
  description?: string;
}

export interface ShowHotelsPayload {
  destination: string;
  nights: number;
  title?: string;
  hotels: HotelOption[];
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
export type HotelSelectedPayload = string;

export type AgentToUiEvent =
  | { type: "ui.showDatePicker"; payload: ShowDatePickerPayload }
  | { type: "ui.showFlights"; payload: ShowFlightsPayload }
  | { type: "ui.showCars"; payload: ShowCarsPayload }
  | { type: "ui.showHotels"; payload: ShowHotelsPayload }
  | { type: "ui.showMessage"; payload: ShowMessagePayload }
  | { type: "ui.showQuickOptions"; payload: ShowQuickOptionsPayload }
  | { type: "ui.showTravelPartySelector"; payload: ShowTravelPartySelectorPayload }
  | { type: "ui.showCabinSelector"; payload: ShowCabinSelectorPayload };

export type UiToAgentEvent =
  | { type: "ui.datesSelected"; payload: DatesSelectedPayload }
  | { type: "ui.flightSelected"; payload: FlightSelectedPayload }
  | { type: "ui.travelPartySelected"; payload: TravelPartySelectedPayload }
  | { type: "ui.cabinSelected"; payload: CabinSelectedPayload }
  | { type: "ui.hotelSelected"; payload: HotelSelectedPayload };

export interface ChatMessageModel {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  timestamp: string;
}
