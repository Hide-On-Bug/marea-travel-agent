"use client";

import { Badge, Body1, Body1Strong, Button, Caption1 } from "@fluentui/react-components";
import { Building20Regular, Star20Filled } from "@fluentui/react-icons";
import type { HotelRoomOption } from "@/lib/mocks";
import styles from "./HotelSelector.module.css";

interface HotelSelectorProps {
  destination: string;
  options: HotelRoomOption[];
  onSelect: (hotelRoomId: string) => Promise<void>;
  disabled?: boolean;
}

export function HotelSelector({ destination, options, onSelect, disabled = false }: HotelSelectorProps) {
  return (
    <section className={styles.wrapper} aria-label="Seleccion de hotel en destino">
      <header className={styles.header}>
        <Building20Regular className={styles.headerIcon} />
        <Body1 className={styles.headerText}>Habitaciones recomendadas en {destination}</Body1>
      </header>

      <div className={styles.grid}>
        {options.map((hotel) => (
          <article key={hotel.id} className={styles.card}>
            <img className={styles.image} src={hotel.image.src} alt={hotel.image.alt} loading="lazy" />

            <div className={styles.tags}>
              {hotel.tags.map((tag) => (
                <Badge key={tag} appearance="filled" color="informative" size="small">
                  {tag}
                </Badge>
              ))}
            </div>

            <Body1Strong className={styles.name}>{hotel.hotelName}</Body1Strong>
            <Caption1 className={styles.roomName}>{hotel.roomName}</Caption1>

            <div className={styles.stars} aria-label={`${hotel.stars} estrellas`}>
              {Array.from({ length: hotel.stars }).map((_, index) => (
                <Star20Filled key={`${hotel.id}-star-${index}`} />
              ))}
            </div>

            <p className={styles.description}>{hotel.description}</p>

            <ul className={styles.features}>
              {hotel.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <div className={styles.meta}>
              <span>{hotel.board}</span>
              <span>{hotel.cancellation}</span>
            </div>

            <div className={styles.footer}>
              <div>
                <Caption1 className={styles.priceLabel}>Desde</Caption1>
                <span className={styles.price}>{hotel.nightPriceEur} EUR/noche</span>
              </div>
              <Button
                appearance="primary"
                className={styles.cta}
                disabled={disabled}
                onClick={() => onSelect(hotel.id)}
              >
                Seleccionar habitacion
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
