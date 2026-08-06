"use client";

import { Badge, Body1Strong, Button, Caption1 } from "@fluentui/react-components";
import { CalendarLtr20Regular, Clock20Regular, Location20Regular } from "@fluentui/react-icons";
import { Warning20Regular } from "@fluentui/react-icons";
import { CheckmarkCircle20Regular } from "@fluentui/react-icons";
import type { FlightOption } from "@/lib/agent/eventTypes";
import styles from "./FlightCard.module.css";

interface FlightCardProps {
  flight: FlightOption;
  selected: boolean;
  onSelect: (flightId: string) => Promise<void>;
  nextAvailableDate?: string;
  passengers: number;
}

const formatIsoDate = (isoDate?: string): string | null => {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${months[month - 1]} ${year}`;
};

export function FlightCard({ flight, selected, onSelect, nextAvailableDate, passengers }: FlightCardProps) {
  const nextDateLabel = formatIsoDate(nextAvailableDate);
  const seatsLeft =
    (Array.from(flight.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 18) + 6;
  const agentFareLabel = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(flight.priceEur);
  const estimatedTotalFare = flight.priceEur * passengers;
  const fareLabel = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(estimatedTotalFare);

  return (
    <article className={`${styles.card} ${selected ? styles.selected : ""}`} aria-label={`Ferry ${flight.id}`}>
      <div className={styles.hero}>
        <img
          src="/images/ferry/Ferry Trasmed.jpg"
          alt="Ferry navegando sobre el mar"
          className={styles.heroPhoto}
        />
        <div className={styles.heroTextBlock}>
          <Caption1 className={styles.heroEyebrow}>Travesia disponible</Caption1>
          <Body1Strong className={styles.heroRoute}>{`${flight.origin} -> ${flight.destination}`}</Body1Strong>
        </div>
      </div>

      <div className={styles.info}>
        <Body1Strong className={styles.name}>{`${flight.airline} · ${flight.id}`}</Body1Strong>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Location20Regular />
            {`${flight.origin} ${flight.departureTime} -> ${flight.destination} ${flight.arrivalTime}`}
          </span>
          <span className={styles.metaItem}>
            <Clock20Regular />
            {`Duracion ${flight.duration} · Escalas ${flight.stops}`}
          </span>
        </div>

        <div className={styles.availabilityPanel}>
          <span className={styles.availabilityItem}>
            <CheckmarkCircle20Regular className={styles.availabilityIcon} />
            Disponible para {passengers} {passengers === 1 ? "pasajero" : "pasajeros"}
          </span>
          <span className={styles.availabilitySeats}>
            Quedan {seatsLeft} plazas libres
          </span>
          <span className={styles.availabilityFare}>
            Tarifa de pasaje: {agentFareLabel}
          </span>
          {nextDateLabel && (
            <span className={`${styles.availabilityItem} ${styles.availabilityWarn}`}>
              <Warning20Regular className={styles.availabilityWarnIcon} />
              {`Proximo ferry disponible: ${nextDateLabel}`}
            </span>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div>
          <Caption1 className={styles.priceLabel}>{`Precio estimado (${passengers} pax)`}</Caption1>
          <span className={styles.price}>{fareLabel}</span>
        </div>
        <Button
          appearance={selected ? "secondary" : "primary"}
          onClick={() => {
            void onSelect(flight.id);
          }}
          className={styles.selectBtn}
        >
          {selected ? "Ferry seleccionado" : "Seleccionar ferry"}
        </Button>
      </div>
      {selected && (
        <div className={styles.selectedBadgeWrap}>
          <Badge appearance="filled" color="success" size="medium">
            Seleccion actual
          </Badge>
        </div>
      )}
    </article>
  );
}
