"use client";

import { Body1, Body1Strong, Card, MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import type { DateRange } from "react-day-picker";
import type { FlightOption } from "@/lib/agent/eventTypes";
import { TravelDateRangePicker } from "./TravelDateRangePicker";
import { FlightCarousel } from "./FlightCarousel";
import styles from "./RichInteractionPanel.module.css";

interface RichInteractionPanelProps {
  destination: string;
  hint: string;
  showDatePicker: boolean;
  dateRange: DateRange | undefined;
  flights: FlightOption[];
  passengers?: number;
  selectedFlightId?: string;
  isLoading: boolean;
  error: string | null;
  onDateRangeChange: (value: DateRange | undefined) => void;
  onConfirmDates: () => Promise<void>;
  onSelectFlight: (flightId: string) => Promise<void>;
}

export function RichInteractionPanel({
  destination,
  hint,
  showDatePicker,
  dateRange,
  flights,
  passengers = 2,
  selectedFlightId,
  isLoading,
  error,
  onDateRangeChange,
  onConfirmDates,
  onSelectFlight,
}: RichInteractionPanelProps) {
  return (
    <Card className={styles.wrapper}>
      <header>
        <Body1Strong>Panel de reserva</Body1Strong>
      </header>

      {error && (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {!showDatePicker && flights.length === 0 && (
        <Body1>Escribe en el chat para iniciar una búsqueda de viaje.</Body1>
      )}

      {showDatePicker && (
        <TravelDateRangePicker
          destination={destination}
          hint={hint}
          range={dateRange}
          onRangeChange={onDateRangeChange}
          onConfirm={onConfirmDates}
          disabled={isLoading}
        />
      )}

      {isLoading && (
        <Spinner label="Buscando vuelos" labelPosition="after" size="small" />
      )}

      {flights.length > 0 && (
        <FlightCarousel
          flights={flights}
          selectedFlightId={selectedFlightId}
          onSelectFlight={onSelectFlight}
          passengers={passengers}
        />
      )}

      {selectedFlightId && (
        <Body1 className={styles.selection}>{`Seleccionado: ${selectedFlightId}`}</Body1>
      )}

      {destination && <Body1 className={styles.destination}>{`Destino actual: ${destination}`}</Body1>}
    </Card>
  );
}
