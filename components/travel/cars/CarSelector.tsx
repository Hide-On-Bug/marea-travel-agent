"use client";

import { Badge, Body1, Body1Strong, Button, Caption1 } from "@fluentui/react-components";
import { People20Regular, VehicleCarProfile20Regular } from "@fluentui/react-icons";
import type { RentalCar } from "@/lib/mocks/cars";
import styles from "./CarSelector.module.css";

interface CarSelectorProps {
  destination: string;
  options: RentalCar[];
  hasPets: boolean;
  onSelect: (carId: string) => Promise<void>;
  disabled?: boolean;
}

export function CarSelector({ destination, options, hasPets, onSelect, disabled = false }: CarSelectorProps) {
  return (
    <section className={styles.wrapper} aria-label="Seleccion de coche de alquiler">
      <header className={styles.header}>
        <VehicleCarProfile20Regular className={styles.headerIcon} />
        <Body1 className={styles.headerText}>Opciones de coche recomendadas en {destination}</Body1>
      </header>

      <div className={styles.grid}>
        {options.map((car) => (
          <article key={car.id} className={styles.card}>
            <div className={styles.tags}>
              {car.tags.map((tag) => (
                <Badge key={tag} appearance="filled" color="informative" size="small">
                  {tag}
                </Badge>
              ))}
            </div>

            <Body1Strong className={styles.name}>{car.name}</Body1Strong>
            <Caption1 className={styles.category}>{car.category}</Caption1>

            <div className={styles.meta}>
              <span><People20Regular /> {car.seats} plazas</span>
              <span><VehicleCarProfile20Regular /> {car.transmission}</span>
              <span><VehicleCarProfile20Regular /> {car.fuel}</span>
            </div>

            <Caption1 className={styles.detail}>Maletas: {car.luggage} · {car.petFriendly && hasPets ? "Apto mascota" : "Sin kit mascota"}</Caption1>

            <div className={styles.footer}>
              <div>
                <Caption1 className={styles.priceLabel}>Desde</Caption1>
                <span className={styles.price}>{car.pricePerDayEur} EUR/dia</span>
              </div>
              <Button
                appearance="primary"
                className={styles.cta}
                onClick={() => onSelect(car.id)}
                disabled={disabled}
              >
                Seleccionar coche
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
