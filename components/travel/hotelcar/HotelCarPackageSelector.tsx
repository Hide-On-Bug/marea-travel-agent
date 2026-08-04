"use client";

import { Badge, Body1, Body1Strong, Button, Caption1 } from "@fluentui/react-components";
import { Building20Regular, VehicleCarProfile20Regular } from "@fluentui/react-icons";
import type { HotelCarPackage } from "@/lib/mocks";
import styles from "./HotelCarPackageSelector.module.css";

interface HotelCarPackageSelectorProps {
  destination: string;
  packages: HotelCarPackage[];
  onSelect: (packageId: string) => Promise<void>;
  disabled?: boolean;
}

export function HotelCarPackageSelector({ destination, packages, onSelect, disabled = false }: HotelCarPackageSelectorProps) {
  return (
    <section className={styles.wrapper} aria-label="Seleccion combinada hotel y coche">
      <header className={styles.header}>
        <Building20Regular className={styles.headerIcon} />
        <Body1 className={styles.headerText}>Paquetes hotel + coche para {destination}</Body1>
      </header>

      <div className={styles.grid}>
        {packages.map((pack) => (
          <article key={pack.id} className={styles.card}>
            <img className={styles.image} src={pack.hotel.image.src} alt={pack.hotel.image.alt} loading="lazy" />

            <div className={styles.tags}>
              <Badge appearance="filled" color="brand" size="small">{pack.title}</Badge>
              {pack.savingsLabel ? (
                <Badge appearance="filled" color="success" size="small">{pack.savingsLabel}</Badge>
              ) : null}
            </div>

            <Body1Strong className={styles.name}>{pack.hotel.hotelName}</Body1Strong>
            <Caption1 className={styles.subtitle}>{pack.hotel.roomName} · {pack.nights} noches</Caption1>

            <div className={styles.includeRow}>
              <span><Building20Regular /> {pack.hotel.board}</span>
              <span><VehicleCarProfile20Regular /> {pack.car.name}</span>
            </div>

            <p className={styles.description}>{pack.hotel.description}</p>

            <div className={styles.footer}>
              <div>
                <Caption1 className={styles.priceLabel}>Total estimado</Caption1>
                <span className={styles.price}>{pack.totalPriceEur} EUR</span>
              </div>
              <Button
                appearance="primary"
                className={styles.cta}
                disabled={disabled}
                onClick={() => onSelect(pack.id)}
              >
                Seleccionar pack
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
