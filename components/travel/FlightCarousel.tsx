"use client";

import { Body1, Body1Strong } from "@fluentui/react-components";
import { VehicleShip20Regular } from "@fluentui/react-icons";
import type { FlightOption } from "@/lib/agent/eventTypes";
import { FlightCard } from "./FlightCard";
import styles from "./FlightCarousel.module.css";

interface FlightCarouselProps {
  flights: FlightOption[];
  selectedFlightId?: string;
  onSelectFlight: (flightId: string) => Promise<void>;
  nextAvailableDate?: string;
  passengers: number;
}

export function FlightCarousel({
  flights,
  selectedFlightId,
  onSelectFlight,
  nextAvailableDate,
  passengers,
}: FlightCarouselProps) {
  if (!flights.length) {
    return <Body1>No hay ferrys disponibles para este momento.</Body1>;
  }

  return (
    <section aria-label="Ferrys sugeridos" className={styles.wrapper}>
      <div className={styles.header}>
        <VehicleShip20Regular className={styles.headerIcon} />
        <Body1Strong className={styles.headerText}>Opciones de ferry para tu viaje</Body1Strong>
      </div>
      <div className={styles.list} role="listbox" aria-label="Selecciona un ferry">
        {flights.map((flight) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            selected={selectedFlightId === flight.id}
            onSelect={onSelectFlight}
            nextAvailableDate={nextAvailableDate}
            passengers={passengers}
          />
        ))}
      </div>
    </section>
  );
}
