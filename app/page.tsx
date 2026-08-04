"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Badge, BrandVariants, createLightTheme, FluentProvider, Text } from "@fluentui/react-components";
import { ChatPanel } from "@/components/chat";
import { CarSelector, HotelCarPackageSelector, HotelSelector, TravelDateRangePicker } from "@/components/travel";
import { TravelPartySelector } from "@/components/travel/party";
import { CabinSelector } from "@/components/travel/cabins";
import {
  createAgentTransport,
  type AgentConnectionStatus,
  type AgentTransport,
  type ChatMessageModel,
  type FlightOption,
  type ShowQuickOptionsPayload,
  type ShowTravelPartySelectorPayload,
} from "@/lib/agent";
import {
  buildHotelCarPackages,
  cabinCatalog,
  featuredCars,
  featuredHotelRooms,
  type HotelCarPackage,
  type HotelRoomOption,
  type RentalCar,
} from "@/lib/mocks";
import styles from "./page.module.css";

const trasmedBrand: BrandVariants = {
  10: "#020c1f", 20: "#061636", 30: "#0a2050", 40: "#0d2a6a", 50: "#103485",
  60: "#143fa0", 70: "#1a4fbe", 80: "#1a4a9e", 90: "#2a5abc", 100: "#3a6acc",
  110: "#5080d8", 120: "#6a96e2", 130: "#84aaec", 140: "#9ebff4",
  150: "#bad3f8", 160: "#d6e7fc",
};
const trasmedTheme = createLightTheme(trasmedBrand);

const statusLabels: Record<AgentConnectionStatus, string> = {
  online: "Conectado",
  connecting: "Conectando…",
  reconnecting: "Reconectando…",
  disconnected: "Desconectado",
  expired: "Sesión expirada",
  failed: "Error",
};

const createMessage = (
  role: ChatMessageModel["role"],
  text: string,
): ChatMessageModel => ({
  id: crypto.randomUUID(),
  role,
  text,
  timestamp: new Date().toISOString(),
});

const formatLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type QuickOptionsFlowMode = "agent" | "upsell-primary" | "upsell-nights" | "hotel-post-car" | "car-post-hotel";

const buildPostCabinQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Ya casi esta todo listo. Quieres que te ayude tambien con algo para cuando llegues a ${destination}?`,
  options: ["Hotel en destino", "Coche de alquiler", "Hotel y coche", "No, gracias"],
});

const buildUpsellNightsQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Perfecto. Cuantas noches te quedas en ${destination}?`,
  options: ["3 noches", "5 noches", "7 noches"],
});

const buildPostHotelCarQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Genial. Quieres que te ensene tambien opciones de coche para ${destination}?`,
  options: ["Si, quiero coche", "No, gracias"],
});

const buildPostCarHotelQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Perfecto. Quieres que te ensene tambien opciones de hotel en ${destination}?`,
  options: ["Si, quiero hotel", "No, gracias"],
});

const parseNightsFromLabel = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
};

const parseTravelIntent = (text: string): { origin: string; destination: string } | null => {
  const normalized = text.trim().toLowerCase();
  const match = normalized.match(/(?:quiero\s+ir\s+de|viajar\s+de)\s+(.+?)\s+a\s+(.+?)(?:\s+el\s+|$)/i);
  if (!match) {
    return null;
  }

  const origin = match[1]?.trim();
  const destination = match[2]?.trim();
  if (!origin || !destination) {
    return null;
  }

  const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  return { origin: cap(origin), destination: cap(destination) };
};

export default function Home() {
  const transportRef = useRef<AgentTransport | null>(null);
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationRef = useRef("");
  const awaitingPostCabinUpsellRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<AgentConnectionStatus>("disconnected");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dateHint, setDateHint] = useState<string | undefined>(undefined);
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedFlightId, setSelectedFlightId] = useState<string | undefined>();
  const [flights, setFlights] = useState<FlightOption[]>([]);
  // Travel party state
  const [showPartySelector, setShowPartySelector] = useState(false);
  const [partyConfig, setPartyConfig] = useState<ShowTravelPartySelectorPayload | null>(null);
  const [passengers, setPassengers] = useState<number>(1);
  const [hasPets, setHasPets] = useState<boolean>(false);
  // Cabin state
  const [showCabinSelector, setShowCabinSelector] = useState(false);
  const [cabinId, setCabinId] = useState<string | null>(null);
  const [isSendingCabinSelection, setIsSendingCabinSelection] = useState(false);
  const [sentCabinSelectionId, setSentCabinSelectionId] = useState<string | null>(null);
  const [showCarSelector, setShowCarSelector] = useState(false);
  const [carOptions, setCarOptions] = useState<RentalCar[]>(featuredCars);
  const [isSendingCarSelection, setIsSendingCarSelection] = useState(false);
  const [sentCarSelectionId, setSentCarSelectionId] = useState<string | null>(null);
  const [showHotelSelector, setShowHotelSelector] = useState(false);
  const [hotelOptions, setHotelOptions] = useState<HotelRoomOption[]>(featuredHotelRooms);
  const [isSendingHotelSelection, setIsSendingHotelSelection] = useState(false);
  const [sentHotelSelectionId, setSentHotelSelectionId] = useState<string | null>(null);
  const [showHotelCarSelector, setShowHotelCarSelector] = useState(false);
  const [hotelCarPackages, setHotelCarPackages] = useState<HotelCarPackage[]>([]);
  const [isSendingHotelCarSelection, setIsSendingHotelCarSelection] = useState(false);
  const [sentHotelCarPackageId, setSentHotelCarPackageId] = useState<string | null>(null);
  const [quickOptions, setQuickOptions] = useState<ShowQuickOptionsPayload | null>(null);
  const [quickOptionsFlowMode, setQuickOptionsFlowMode] = useState<QuickOptionsFlowMode | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  const appendMessage = (message: ChatMessageModel) => {
    setMessages((prev) => [...prev, message]);
  };

  const releaseBusy = () => {
    if (busyTimeoutRef.current) {
      clearTimeout(busyTimeoutRef.current);
      busyTimeoutRef.current = null;
    }
    setIsBusy(false);
  };

  useEffect(() => {
    // Consent is intentionally per-page-load: hard refresh must show it again.
    setConsentAccepted(false);
    setConsentReady(true);
  }, []);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    if (!consentReady || !consentAccepted) {
      return;
    }

    const transport = createAgentTransport();
    transportRef.current = transport;

    const unsubscribe = transport.subscribe((event) => {
      // Cualquier evento del agente desbloquea el chat
      releaseBusy();

      if (event.type === "ui.showMessage") {
        appendMessage(createMessage("agent", event.payload.text));

        if (awaitingPostCabinUpsellRef.current) {
          const destinationLabel = destinationRef.current || "tu destino";
          setQuickOptions(buildPostCabinQuickOptions(destinationLabel));
          setQuickOptionsFlowMode("upsell-primary");
          awaitingPostCabinUpsellRef.current = false;
        }
      }

      if (event.type === "ui.showQuickOptions") {
        setQuickOptions(event.payload);
        setQuickOptionsFlowMode("agent");
        setShowDatePicker(false);
        setShowPartySelector(false);
        setShowCabinSelector(false);
        setShowCarSelector(false);
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setPanelError(null);
      }

      if (event.type === "ui.showDatePicker") {
        setOrigin(event.payload.origin ?? "");
        setDestination(event.payload.destination);
        setDateHint(event.payload.hint);
        setMinDate(event.payload.minDate);
        setShowDatePicker(true);
        setDateRange(undefined);
        setPanelLoading(false);
        setPanelError(null);
      }

      if (event.type === "ui.showFlights") {
        setFlights(event.payload.flights);
        setPanelLoading(false);
      }

      if (event.type === "ui.showTravelPartySelector") {
        setPartyConfig(event.payload);
        setShowPartySelector(true);
        setShowDatePicker(false);
        setShowCabinSelector(false);
        setShowCarSelector(false);
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setPanelError(null);
      }

      if (event.type === "ui.showCabinSelector") {
        setCabinId(event.payload.cabinId);
        setShowCabinSelector(true);
        setSentCabinSelectionId(null);
        setShowPartySelector(false);
        setShowDatePicker(false);
        setShowCarSelector(false);
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setPanelError(null);
      }
    });

    const unsubscribeStatus = transport.subscribeConnectionStatus((status) => {
      setConnectionStatus(status);
      // Si la conexión cae mientras esperamos respuesta, desbloqueamos
      if (status === "disconnected" || status === "failed") {
        releaseBusy();
      }
    });

    transport.connect().catch(() => {
      appendMessage(createMessage("system", "No se pudo conectar con el agente."));
    });

    return () => {
      unsubscribe();
      unsubscribeStatus();
      transport.disconnect().catch(() => undefined);
    };
  }, [consentAccepted, consentReady]);

  const onAcceptConsent = () => {
    setConsentAccepted(true);
  };

  const onSendMessage = async (text: string) => {
    if (connectionStatus !== "online") {
      return;
    }

    setQuickOptions(null);
    setShowCarSelector(false);
    setShowHotelSelector(false);
    setShowHotelCarSelector(false);

    // Fallback local: if agent does not emit ui.showDatePicker, keep the classic first-step UX.
    if (!showDatePicker && !showPartySelector && !showCabinSelector && !showCarSelector && !showHotelSelector && !showHotelCarSelector) {
      const travelIntent = parseTravelIntent(text);
      if (travelIntent) {
        setOrigin(travelIntent.origin);
        setDestination(travelIntent.destination);
        setDateHint("Selecciona fecha de ida y vuelta");
        setMinDate(formatLocalIsoDate(new Date()));
        setDateRange(undefined);
        setShowDatePicker(true);
      }
    }

    appendMessage(createMessage("user", text));
    setPanelError(null);
    setIsBusy(true);

    // Red de seguridad: si el agente no responde en 20s, desbloqueamos
    busyTimeoutRef.current = setTimeout(() => {
      setIsBusy(false);
      busyTimeoutRef.current = null;
    }, 20_000);

    try {
      await transportRef.current?.sendMessage(text);
    } catch {
      setPanelError("No fue posible procesar tu mensaje.");
      releaseBusy();
    }
  };

  const formattedRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return null;
    }

    return {
      fromDate: formatLocalIsoDate(dateRange.from),
      toDate: formatLocalIsoDate(dateRange.to),
    };
  }, [dateRange]);

  // Helper: formatea ISO YYYY-MM-DD a "18 jul 2026"
  const fmtDate = (iso: string) => {
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${months[m - 1]} ${y}`;
  };

  const onConfirmDates = async () => {
    if (!formattedRange) {
      setPanelError("Debes elegir fecha de ida y vuelta.");
      return;
    }

    setPanelLoading(true);
    setPanelError(null);
    setFlights([]);
    setSelectedFlightId(undefined);

    try {
      await transportRef.current?.sendEvent({
        type: "ui.datesSelected",
        payload: {
          origin,
          destination,
          fromDate: formattedRange.fromDate,
          toDate: formattedRange.toDate,
        },
      });
      setShowDatePicker(false);
      appendMessage(createMessage("system",
        `📅 Fechas: ${origin ? `${origin} → ` : ""}${destination} · ${fmtDate(formattedRange.fromDate)} – ${fmtDate(formattedRange.toDate)}`
      ));
    } catch {
      setPanelLoading(false);
      setPanelError("No fue posible recuperar vuelos para el rango seleccionado.");
    }
  };

  const onConfirmParty = async (selectedPassengers: number, selectedHasPets: boolean) => {
    setPassengers(selectedPassengers);
    setHasPets(selectedHasPets);
    setShowPartySelector(false);
    setPanelError(null);

    try {
      await transportRef.current?.sendEvent({
        type: "ui.travelPartySelected",
        payload: { passengers: selectedPassengers, hasPets: selectedHasPets },
      });
      appendMessage(createMessage("system",
        `👥 ${selectedPassengers} ${selectedPassengers === 1 ? "pasajero" : "pasajeros"}${
          selectedHasPets ? " · con mascota 🐾" : ""
        }`
      ));
    } catch {
      setPanelError("No fue posible enviar la selección de pasajeros.");
    }
  };

  const onSelectCabin = async (selectedCabinId: string) => {
    if (isSendingCabinSelection || sentCabinSelectionId === selectedCabinId) {
      return;
    }

    const cabin = cabinCatalog[selectedCabinId];
    if (!cabin) return;

    setPanelError(null);
    setIsSendingCabinSelection(true);

    // 1) Update the UI first with a local selection card aligned to the right.
    appendMessage(
      createMessage(
        "system",
        `### Tu seleccion\n- Camarote: ${cabin.name}\n- Cubierta: ${cabin.deck}\n- Precio: +${cabin.priceDelta} EUR\n- Pet friendly: ${cabin.petFriendly ? "Si" : "No"}`,
      ),
    );

    const summaryInput = [
      origin && `Origen: ${origin}`,
      destination && `Destino: ${destination}`,
      formattedRange && `Fechas: ${fmtDate(formattedRange.fromDate)} - ${fmtDate(formattedRange.toDate)}`,
      `Pasajeros: ${passengers}`,
      `Mascota: ${hasPets ? "Si" : "No"}`,
      `Camarote: ${cabin.name}`,
      cabin.deck && `Cubierta: ${cabin.deck}`,
      `Suplemento: +${cabin.priceDelta} EUR`,
    ]
      .filter(Boolean)
      .join(". ");

    try {
      await transportRef.current?.sendEvent({
        type: "ui.cabinSelected",
        payload: summaryInput,
      });

      setSentCabinSelectionId(selectedCabinId);
      setShowCabinSelector(false);
      awaitingPostCabinUpsellRef.current = true;
    } catch {
      setPanelError("No se pudo enviar la seleccion del camarote. Intentalo de nuevo.");
      appendMessage(
        createMessage(
          "system",
          "No se pudo enviar la seleccion al agente. Vuelve a intentarlo.",
        ),
      );
    } finally {
      setIsSendingCabinSelection(false);
    }
  };

  const onSelectFlight = async (flightId: string) => {
    setSelectedFlightId(flightId);
    setPanelError(null);

    try {
      await transportRef.current?.sendEvent({
        type: "ui.flightSelected",
        payload: {
          flightId,
        },
      });
    } catch {
      setPanelError("No fue posible registrar la selección del vuelo.");
    }
  };

  const onSelectQuickOption = async (option: string) => {
    if (!quickOptionsFlowMode || !quickOptions) {
      return;
    }

    if (quickOptionsFlowMode === "upsell-primary") {
      if (option === "Hotel y coche") {
        const destinationLabel = destinationRef.current || "tu destino";
        setQuickOptions(buildUpsellNightsQuickOptions(destinationLabel));
        setQuickOptionsFlowMode("upsell-nights");
        return;
      }

      if (option === "Hotel en destino") {
        setQuickOptions(null);
        setQuickOptionsFlowMode(null);
        setShowCarSelector(false);
        setShowHotelCarSelector(false);
        setShowHotelSelector(true);
        setSentHotelSelectionId(null);
        setHotelOptions(featuredHotelRooms);
        appendMessage(createMessage("agent", "🏨 Te muestro 2 propuestas de habitacion en destino para que elijas."));
        return;
      }

      if (option === "Coche de alquiler") {
        setQuickOptions(null);
        setQuickOptionsFlowMode(null);
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setShowCarSelector(true);
        setSentCarSelectionId(null);
        setCarOptions(featuredCars);
        appendMessage(createMessage("agent", "🚗 Te muestro 2 opciones de coche para tu llegada."));
        return;
      }

      if (option === "No, gracias") {
        setQuickOptions(null);
        setQuickOptionsFlowMode(null);
        appendMessage(createMessage("agent", "👌 Perfecto. Continuamos con tu reserva de ferry."));
        return;
      }

      // Keep these options agent-driven so conversation continues as before.
      await onSendMessage(option);
      return;
    }

    if (quickOptionsFlowMode === "upsell-nights") {
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      setShowHotelSelector(false);
      setShowCarSelector(false);
      const destinationLabel = destinationRef.current || "tu destino";
      const nights = parseNightsFromLabel(option);
      setHotelCarPackages(buildHotelCarPackages(nights));
      setShowHotelCarSelector(true);
      setSentHotelCarPackageId(null);
      appendMessage(createMessage("agent", `🏨🚗 Genial. Aqui tienes 2 packs de hotel + coche para ${nights} noches en ${destinationLabel}.`));
      return;
    }

    if (quickOptionsFlowMode === "hotel-post-car") {
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);

      if (option === "Si, quiero coche") {
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setShowCarSelector(true);
        setSentCarSelectionId(null);
        setCarOptions(featuredCars);
        appendMessage(createMessage("agent", "🚗 Perfecto. Te muestro 2 opciones de coche para completar tu viaje."));
        return;
      }

      appendMessage(createMessage("agent", "👌 Perfecto. Dejamos solo hotel en destino por ahora."));
      return;
    }

    if (quickOptionsFlowMode === "car-post-hotel") {
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);

      if (option === "Si, quiero hotel") {
        setShowCarSelector(false);
        setShowHotelCarSelector(false);
        setShowHotelSelector(true);
        setSentHotelSelectionId(null);
        setHotelOptions(featuredHotelRooms);
        appendMessage(createMessage("agent", "🏨 Perfecto. Te muestro 2 propuestas de hotel para completar el viaje."));
        return;
      }

      appendMessage(createMessage("agent", "👌 Perfecto. Dejamos solo coche de alquiler por ahora."));
      return;
    }

    await onSendMessage(option);
  };

  const onSelectCar = async (carId: string) => {
    if (isSendingCarSelection || sentCarSelectionId === carId) {
      return;
    }

    const selectedCar = carOptions.find((car) => car.id === carId);
    if (!selectedCar) {
      return;
    }

    setIsSendingCarSelection(true);
    setPanelError(null);

    appendMessage(
      createMessage(
        "system",
        `### Coche seleccionado\n- Modelo: ${selectedCar.name}\n- Tipo: ${selectedCar.category}\n- Transmision: ${selectedCar.transmission}\n- Precio: ${selectedCar.pricePerDayEur} EUR/dia`,
      ),
    );
    appendMessage(
      createMessage(
        "agent",
        `Perfecto. Dejo anotado ${selectedCar.name} para tu llegada a ${destinationRef.current || "destino"}.`,
      ),
    );

    // Only suggest hotel if user has not already selected one.
    if (!sentHotelSelectionId) {
      setQuickOptions(buildPostCarHotelQuickOptions(destinationRef.current || "tu destino"));
      setQuickOptionsFlowMode("car-post-hotel");
    }

    setSentCarSelectionId(carId);
    setShowCarSelector(false);
    setIsSendingCarSelection(false);
  };

  const onSelectHotel = async (hotelRoomId: string) => {
    if (isSendingHotelSelection || sentHotelSelectionId === hotelRoomId) {
      return;
    }

    const selectedHotel = hotelOptions.find((hotel) => hotel.id === hotelRoomId);
    if (!selectedHotel) {
      return;
    }

    setIsSendingHotelSelection(true);
    setPanelError(null);

    appendMessage(
      createMessage(
        "system",
        `### Habitacion seleccionada\n- Hotel: ${selectedHotel.hotelName}\n- Tipo: ${selectedHotel.roomName}\n- Regimen: ${selectedHotel.board}\n- Precio: ${selectedHotel.nightPriceEur} EUR/noche`,
      ),
    );
    appendMessage(
      createMessage(
        "agent",
        `Perfecto. Dejo anotada la opcion ${selectedHotel.roomName} en ${selectedHotel.hotelName}.`,
      ),
    );

    // Only suggest car if user has not already selected one.
    if (!sentCarSelectionId) {
      setQuickOptions(buildPostHotelCarQuickOptions(destinationRef.current || "tu destino"));
      setQuickOptionsFlowMode("hotel-post-car");
    }

    setSentHotelSelectionId(hotelRoomId);
    setShowHotelSelector(false);
    setIsSendingHotelSelection(false);
  };

  const onSelectHotelCarPackage = async (packageId: string) => {
    if (isSendingHotelCarSelection || sentHotelCarPackageId === packageId) {
      return;
    }

    const selectedPack = hotelCarPackages.find((pack) => pack.id === packageId);
    if (!selectedPack) {
      return;
    }

    setIsSendingHotelCarSelection(true);
    setPanelError(null);

    appendMessage(
      createMessage(
        "system",
        `### Pack seleccionado\n- Pack: ${selectedPack.title}\n- Hotel: ${selectedPack.hotel.hotelName} (${selectedPack.hotel.roomName})\n- Coche: ${selectedPack.car.name}\n- Duracion: ${selectedPack.nights} noches\n- Total estimado: ${selectedPack.totalPriceEur} EUR`,
      ),
    );
    appendMessage(
      createMessage(
        "agent",
        `Excelente eleccion. Ya he guardado tu pack ${selectedPack.title} con hotel y coche.`,
      ),
    );

    setSentHotelCarPackageId(packageId);
    setShowHotelCarSelector(false);
    setIsSendingHotelCarSelection(false);
  };

  return (
    <FluentProvider theme={trasmedTheme}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerWaves} aria-hidden="true" />
          <div className={styles.headerBoat} aria-hidden="true" />
          <div className={styles.headerBrand}>
            <span className={styles.headerLogo}>⚓</span>
            <div>
              <Text className={styles.headerTitle}>Marea</Text>
            </div>
          </div>
          <Badge
            appearance="filled"
            color="informative"
            size="small"
            className={`${styles.statusBadge} ${
              connectionStatus === "online" ? styles.statusBadgeOnline : ""
            }`}
          >
            {statusLabels[connectionStatus]}
          </Badge>
        </header>
        <main className={styles.main}>
          <section className={styles.chatPanel}>
            <ChatPanel
              messages={messages}
              isBusy={isBusy}
              onSendMessage={onSendMessage}
              consentRequired={consentReady && !consentAccepted}
              onAcceptConsent={onAcceptConsent}
              inputDisabled={connectionStatus !== "online"}
              inlineContent={
                showDatePicker ? (
                  <>
                    <TravelDateRangePicker
                      origin={origin || undefined}
                      destination={destination}
                      hint={dateHint}
                      minDate={minDate}
                      range={dateRange}
                      onRangeChange={setDateRange}
                      onConfirm={onConfirmDates}
                      disabled={panelLoading}
                    />
                    {panelError && <p className={styles.panelError}>{panelError}</p>}
                  </>
                ) : showPartySelector && partyConfig ? (
                  <TravelPartySelector
                    config={partyConfig}
                    onConfirm={onConfirmParty}
                  />
                ) : showCabinSelector && cabinId ? (
                  <CabinSelector
                    cabinId={cabinId}
                    passengers={passengers}
                    hasPets={hasPets}
                    onSelect={onSelectCabin}
                    disabled={isSendingCabinSelection}
                  />
                ) : showCarSelector ? (
                  <CarSelector
                    destination={destination || "tu destino"}
                    options={carOptions}
                    hasPets={hasPets}
                    onSelect={onSelectCar}
                    disabled={isSendingCarSelection}
                  />
                ) : showHotelSelector ? (
                  <HotelSelector
                    destination={destination || "tu destino"}
                    options={hotelOptions}
                    onSelect={onSelectHotel}
                    disabled={isSendingHotelSelection}
                  />
                ) : showHotelCarSelector ? (
                  <HotelCarPackageSelector
                    destination={destination || "tu destino"}
                    packages={hotelCarPackages}
                    onSelect={onSelectHotelCarPackage}
                    disabled={isSendingHotelCarSelection}
                  />
                ) : quickOptions ? (
                  <section className={styles.quickOptionsPanel} aria-label="Opciones sugeridas por el asistente">
                    {quickOptions.title && <p className={styles.quickOptionsTitle}>{quickOptions.title}</p>}
                    <div className={styles.quickOptionsList}>
                      {quickOptions.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={styles.quickOptionsButton}
                          onClick={() => onSelectQuickOption(option)}
                          disabled={isBusy || connectionStatus !== "online"}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : undefined
              }
            />
          </section>
        </main>
      </div>
    </FluentProvider>
  );
}
