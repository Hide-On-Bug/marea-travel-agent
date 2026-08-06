"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { DateRange } from "react-day-picker";
import { Badge, BrandVariants, createLightTheme, FluentProvider, Text } from "@fluentui/react-components";
import { ChatPanel } from "@/components/chat";
import { CarSelector, FlightCarousel, HotelCarPackageSelector, HotelSelector, TravelDateRangePicker } from "@/components/travel";
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

type QuickOptionsFlowMode =
  | "agent"
  | "upsell-primary"
  | "upsell-nights"
  | "hotel-nights"
  | "car-rental-days"
  | "hotel-post-car"
  | "car-post-hotel";

const buildPostCabinQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Ya casi esta todo listo. Quieres que te ayude tambien con algo para cuando llegues a ${destination}?`,
  options: ["Hotel en destino", "Coche de alquiler", "Hotel y coche", "No, gracias"],
});

const buildUpsellNightsQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Perfecto. Cuantas noches te quedas en ${destination}?`,
  options: ["3 noches", "5 noches", "7 noches"],
});

const buildHotelNightsQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Perfecto. Cuantas noches quieres hotel en ${destination}?`,
  options: ["3 noches", "5 noches", "7 noches"],
});

const buildCarDaysQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Perfecto. Cuantos dias quieres coche en ${destination}?`,
  options: ["3 dias", "5 dias", "7 dias"],
});

const buildPostHotelCarQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Genial. Quieres que te ensene tambien opciones de coche para ${destination}?`,
  options: ["Si, quiero coche", "No, gracias"],
});

const buildPostCarHotelQuickOptions = (destination: string): ShowQuickOptionsPayload => ({
  title: `Perfecto. Quieres que te ensene tambien opciones de hotel en ${destination} o prefieres continuar al pago?`,
  options: ["Si, quiero hotel", "Continuar a pago"],
});

const parseNightsFromLabel = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
};

const inferPassengersFromPrompt = (text: string): number | null => {
  const normalized = text.toLowerCase();

  const directMatch = normalized.match(/(\d+)\s*(pasajeros?|pax)/i);
  if (directMatch) {
    const parsed = Number.parseInt(directMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const somosMatch = normalized.match(/somos\s+(\d+)/i);
  if (somosMatch) {
    const parsed = Number.parseInt(somosMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const normalizeAgentPetFriendlyText = (text: string, hasPets: boolean): string => {
  if (hasPets) {
    return text;
  }

  const normalizedText = text.replace(/�/g, "").trim();
  const sentenceParts = normalizedText.match(/[^.!?]+[.!?]?/g) ?? [normalizedText];
  const filteredParts = sentenceParts.filter((part) => !/pet\s*friendly/i.test(part));

  const cleanedText = filteredParts
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .trim();

  return cleanedText.length ? cleanedText : normalizedText;
};

const defaultPartySelectorConfig: ShowTravelPartySelectorPayload = {
  minPassengers: 1,
  maxPassengers: 6,
  defaultPassengers: 2,
  allowPets: true,
};

interface BookingMemory {
  trip: {
    origin?: string;
    destination?: string;
    fromDate?: string;
    toDate?: string;
  };
  passengers: number;
  hasPets: boolean;
  selections: {
    flight?: { id: string; priceEur: number };
    cabin?: { id: string; priceDeltaEur: number };
    car?: { id: string; priceEur: number; basis: "day" | "package"; days?: number; unitPriceEur?: number };
    hotel?: { id: string; priceEur: number; basis: "night" | "package"; nights?: number; unitPriceEur?: number };
    hotelCarPackage?: { id: string; totalPriceEur: number; title?: string; nights?: number };
  };
  totals: {
    baseFareEur: number;
    addonsEur: number;
    estimatedTotalEur: number;
  };
  updatedAt: string;
}

interface BudgetSummaryLine {
  label: string;
  amountEur: number;
}

interface BudgetSummarySnapshot {
  lines: BudgetSummaryLine[];
  subtotalEur: number;
  discountEur: number;
  totalEur: number;
}

const createEmptyBookingMemory = (): BookingMemory => ({
  trip: {},
  passengers: 1,
  hasPets: false,
  selections: {},
  totals: {
    baseFareEur: 0,
    addonsEur: 0,
    estimatedTotalEur: 0,
  },
  updatedAt: new Date().toISOString(),
});

const recalculateBookingTotals = (memory: BookingMemory): BookingMemory => {
  const baseFareEur = memory.selections.flight?.priceEur ?? 0;

  const cabinEur = memory.selections.cabin?.priceDeltaEur ?? 0;
  const packageEur = memory.selections.hotelCarPackage?.totalPriceEur ?? 0;
  const carEur = packageEur > 0 ? 0 : (memory.selections.car?.priceEur ?? 0);
  const hotelEur = packageEur > 0 ? 0 : (memory.selections.hotel?.priceEur ?? 0);
  const addonsEur = cabinEur + packageEur + carEur + hotelEur;

  return {
    ...memory,
    totals: {
      baseFareEur,
      addonsEur,
      estimatedTotalEur: baseFareEur + addonsEur,
    },
    updatedAt: new Date().toISOString(),
  };
};

const formatEur = (value: number): string => new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
}).format(value);

export default function Home() {
  const transportRef = useRef<AgentTransport | null>(null);
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationRef = useRef("");
  const hasPetsRef = useRef(false);
  const hasCompletedPaymentRef = useRef(false);
  const awaitingPostCabinUpsellRef = useRef(false);
  const bookingMemoryRef = useRef<BookingMemory>(createEmptyBookingMemory());
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
  const [nextAvailableFerryDate, setNextAvailableFerryDate] = useState<string | undefined>();
  // Travel party state
  const [showPartySelector, setShowPartySelector] = useState(false);
  const [partyConfig, setPartyConfig] = useState<ShowTravelPartySelectorPayload | null>(null);
  const [passengers, setPassengers] = useState<number>(defaultPartySelectorConfig.defaultPassengers);
  const [hasPets, setHasPets] = useState<boolean>(false);
  // Cabin state
  const [showCabinSelector, setShowCabinSelector] = useState(false);
  const [cabinId, setCabinId] = useState<string | null>(null);
  const [isSendingCabinSelection, setIsSendingCabinSelection] = useState(false);
  const [sentCabinSelectionId, setSentCabinSelectionId] = useState<string | null>(null);
  const [showCarSelector, setShowCarSelector] = useState(false);
  const [carOptions, setCarOptions] = useState<RentalCar[]>(featuredCars);
  const [carRentalDays, setCarRentalDays] = useState<number>(3);
  const [isSendingCarSelection, setIsSendingCarSelection] = useState(false);
  const [sentCarSelectionId, setSentCarSelectionId] = useState<string | null>(null);
  const [showHotelSelector, setShowHotelSelector] = useState(false);
  const [hotelOptions, setHotelOptions] = useState<HotelRoomOption[]>(featuredHotelRooms);
  const [hotelStayNights, setHotelStayNights] = useState<number>(3);
  const [isSendingHotelSelection, setIsSendingHotelSelection] = useState(false);
  const [sentHotelSelectionId, setSentHotelSelectionId] = useState<string | null>(null);
  const [showHotelCarSelector, setShowHotelCarSelector] = useState(false);
  const [hotelCarPackages, setHotelCarPackages] = useState<HotelCarPackage[]>([]);
  const [isSendingHotelCarSelection, setIsSendingHotelCarSelection] = useState(false);
  const [sentHotelCarPackageId, setSentHotelCarPackageId] = useState<string | null>(null);
  const [quickOptions, setQuickOptions] = useState<ShowQuickOptionsPayload | null>(null);
  const [quickOptionsFlowMode, setQuickOptionsFlowMode] = useState<QuickOptionsFlowMode | null>(null);
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [showBudgetSummary, setShowBudgetSummary] = useState(false);
  const [budgetSnapshot, setBudgetSnapshot] = useState<BudgetSummarySnapshot | null>(null);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [reservationCode, setReservationCode] = useState<string | null>(null);
  const [hasCompletedPayment, setHasCompletedPayment] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  const appendMessage = (message: ChatMessageModel) => {
    setMessages((prev) => [...prev, message]);
  };

  const updateBookingMemory = (updater: (current: BookingMemory) => BookingMemory) => {
    const next = updater(bookingMemoryRef.current);
    bookingMemoryRef.current = recalculateBookingTotals(next);
  };

  const resetBookingMemory = () => {
    bookingMemoryRef.current = createEmptyBookingMemory();
  };

  const buildBudgetSummarySnapshot = (): BudgetSummarySnapshot => {
    const memory = bookingMemoryRef.current;
    const lines: BudgetSummaryLine[] = [];
    const passengersLabel = memory.passengers > 0 ? memory.passengers : passengers;

    if (memory.selections.flight?.priceEur) {
      const from = memory.trip.origin ?? origin ?? "Origen";
      const to = memory.trip.destination ?? destination ?? "Destino";
      lines.push({
        label: `Pasaje ${from} -> ${to} (${passengersLabel} pax)`,
        amountEur: memory.selections.flight.priceEur,
      });
    }

    if (memory.selections.cabin?.priceDeltaEur) {
      const selectedCabin = memory.selections.cabin.id ? cabinCatalog[memory.selections.cabin.id] : undefined;
      lines.push({
        label: `Alojamiento: ${selectedCabin?.name ?? "Camarote"}`,
        amountEur: memory.selections.cabin.priceDeltaEur,
      });
    }

    if (memory.selections.car?.priceEur) {
      const selectedCar = [...carOptions, ...featuredCars].find((car) => car.id === memory.selections.car?.id);
      const daysLabel = memory.selections.car.days ?? carRentalDays;
      lines.push({
        label: `${selectedCar?.name ?? "Coche"} x ${daysLabel} ${daysLabel === 1 ? "dia" : "dias"}`,
        amountEur: memory.selections.car.priceEur,
      });
    }

    if (memory.selections.hotel?.priceEur) {
      const selectedHotel = featuredHotelRooms.find((hotel) => hotel.id === memory.selections.hotel?.id);
      const nightsLabel = memory.selections.hotel.nights ?? hotelStayNights;
      lines.push({
        label: `Hotel: ${selectedHotel ? `${selectedHotel.hotelName} · ${selectedHotel.roomName}` : "Alojamiento en destino"} x ${nightsLabel} ${nightsLabel === 1 ? "noche" : "noches"}`,
        amountEur: memory.selections.hotel.priceEur,
      });
    }

    if (memory.selections.hotelCarPackage?.totalPriceEur) {
      lines.push({
        label: memory.selections.hotelCarPackage.title ?? "Pack hotel + coche",
        amountEur: memory.selections.hotelCarPackage.totalPriceEur,
      });
    }

    const subtotalEur = lines.reduce((acc, line) => acc + line.amountEur, 0);
    const discountEur = subtotalEur * 0.1;
    const totalEur = subtotalEur - discountEur;

    return {
      lines,
      subtotalEur,
      discountEur,
      totalEur,
    };
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
    hasPetsRef.current = hasPets;
  }, [hasPets]);

  useEffect(() => {
    hasCompletedPaymentRef.current = hasCompletedPayment;
  }, [hasCompletedPayment]);

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
        const normalizedText = normalizeAgentPetFriendlyText(event.payload.text, hasPetsRef.current);
        appendMessage(createMessage("agent", normalizedText));

        if (awaitingPostCabinUpsellRef.current) {
          const destinationLabel = destinationRef.current || "tu destino";
          setQuickOptions(buildPostCabinQuickOptions(destinationLabel));
          setQuickOptionsFlowMode("upsell-primary");
          awaitingPostCabinUpsellRef.current = false;
        }
      }

      if (event.type === "ui.showQuickOptions") {
        if (hasCompletedPaymentRef.current) {
          return;
        }
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
        if (hasCompletedPaymentRef.current) {
          return;
        }
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
        if (hasCompletedPaymentRef.current) {
          return;
        }
        setFlights(event.payload.flights);
        setNextAvailableFerryDate(event.payload.fromDate);
        setShowDatePicker(false);
        setPanelLoading(false);
        updateBookingMemory((current) => ({
          ...current,
          trip: {
            ...current.trip,
            origin: origin || current.trip.origin,
            destination: event.payload.destination,
            fromDate: event.payload.fromDate,
            toDate: event.payload.toDate,
          },
        }));
      }

      if (event.type === "ui.showCars") {
        if (hasCompletedPaymentRef.current) {
          return;
        }
        const hydratedCars: RentalCar[] = event.payload.cars.map((car, index) => {
          const fallback = featuredCars.find((item) => item.id === car.id) ?? featuredCars[index % featuredCars.length];

          return {
            id: car.id,
            name: car.name,
            category: car.category,
            imageSrc: car.imageSrc ?? fallback.imageSrc,
            imageAlt: car.imageAlt ?? fallback.imageAlt,
            seats: car.seats ?? fallback.seats,
            transmission: /auto/i.test(car.transmission) ? "Automatico" : "Manual",
            fuel: car.fuel ?? fallback.fuel,
            luggage: car.luggage ?? fallback.luggage,
            pricePerDayEur: car.pricePerDayEur,
            petFriendly: car.petFriendly ?? fallback.petFriendly,
            tags: car.tags ?? fallback.tags,
          };
        });

        setDestination(event.payload.destination);
        setCarRentalDays(event.payload.days);
        setCarOptions(hydratedCars);
        setShowCarSelector(true);
        setSentCarSelectionId(null);
        setQuickOptions(null);
        setQuickOptionsFlowMode(null);
        setShowDatePicker(false);
        setShowPartySelector(false);
        setShowCabinSelector(false);
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setPanelLoading(false);
        setPanelError(null);

        if (event.payload.title) {
          appendMessage(createMessage("agent", event.payload.title));
        }
      }

      if (event.type === "ui.showHotels") {
        if (hasCompletedPaymentRef.current) {
          return;
        }
        const hydratedHotels: HotelRoomOption[] = event.payload.hotels.map((hotel, index) => {
          const fallback = featuredHotelRooms.find((item) => item.id === hotel.id) ?? featuredHotelRooms[index % featuredHotelRooms.length];

          return {
            id: hotel.id,
            hotelName: hotel.hotelName,
            roomName: hotel.roomName,
            stars: hotel.stars ?? fallback.stars,
            board: hotel.board ?? fallback.board,
            cancellation: hotel.cancellation ?? fallback.cancellation,
            nightPriceEur: hotel.nightPriceEur,
            image: hotel.image ?? fallback.image,
            tags: hotel.tags ?? fallback.tags,
            features: hotel.features ?? fallback.features,
            description: hotel.description ?? fallback.description,
          };
        });

        setDestination(event.payload.destination);
        setHotelStayNights(event.payload.nights);
        setHotelOptions(hydratedHotels);
        setShowHotelSelector(true);
        setSentHotelSelectionId(null);
        setQuickOptions(null);
        setQuickOptionsFlowMode(null);
        setShowDatePicker(false);
        setShowPartySelector(false);
        setShowCabinSelector(false);
        setShowCarSelector(false);
        setShowHotelCarSelector(false);
        setPanelLoading(false);
        setPanelError(null);

        if (event.payload.title) {
          appendMessage(createMessage("agent", event.payload.title));
        }
      }

      if (event.type === "ui.showTravelPartySelector") {
        if (hasCompletedPaymentRef.current) {
          return;
        }
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
        if (hasCompletedPaymentRef.current) {
          return;
        }
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
    setHasCompletedPayment(false);
    resetBookingMemory();
  };

  const onSendMessage = async (text: string) => {
    if (connectionStatus !== "online") {
      return;
    }

    const inferredPassengers = inferPassengersFromPrompt(text);
    if (inferredPassengers) {
      setPassengers(inferredPassengers);
      updateBookingMemory((current) => ({
        ...current,
        passengers: inferredPassengers,
      }));
    }

    setQuickOptions(null);
    setShowCheckoutPrompt(false);
    setShowBudgetSummary(false);
    setBudgetSnapshot(null);
    setIsPaymentSuccess(false);
    setReservationCode(null);
    setShowCarSelector(false);
    setShowHotelSelector(false);
    setShowHotelCarSelector(false);
    setFlights([]);
    setSelectedFlightId(undefined);
    setNextAvailableFerryDate(undefined);

    // Date picker fallback intentionally disabled: demo now starts with fixed ferry availability.

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
      appendMessage(createMessage("user",
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

      const defaultCabinId = selectedHasPets ? "exterior-pet-friendly" : "exterior-standard";
      setShowDatePicker(false);
      setShowCarSelector(false);
      setShowHotelSelector(false);
      setShowHotelCarSelector(false);
      setQuickOptions(null);
      setCabinId(defaultCabinId);
      setSentCabinSelectionId(null);
      setShowCabinSelector(true);

      appendMessage(
        createMessage(
          "agent",
          "Perfecto, gracias. Ahora elige el camarote para continuar con tu reserva.",
        ),
      );

      updateBookingMemory((current) => ({
        ...current,
        passengers: selectedPassengers,
        hasPets: selectedHasPets,
        selections: {
          ...current.selections,
          flight: current.selections.flight
            ? {
                ...current.selections.flight,
                priceEur: (() => {
                  const selectedFlight = flights.find((flight) => flight.id === current.selections.flight?.id);
                  if (selectedFlight) {
                    return selectedFlight.priceEur * selectedPassengers;
                  }
                  return current.selections.flight.priceEur;
                })(),
              }
            : current.selections.flight,
        },
      }));
      appendMessage(createMessage("user",
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

    updateBookingMemory((current) => ({
      ...current,
      selections: {
        ...current.selections,
        cabin: {
          id: cabin.id,
          priceDeltaEur: cabin.priceDelta,
        },
      },
    }));

    setPanelError(null);
    setIsSendingCabinSelection(true);

    // 1) Update the UI first with a local selection card aligned to the right.
    const selectedCabinLines = [
      `### Tu seleccion`,
      `- Camarote: ${cabin.name}`,
      `- Cubierta: ${cabin.deck}`,
      `- Precio: +${cabin.priceDelta} EUR`,
      hasPets ? `- Pet friendly: ${cabin.petFriendly ? "Si" : "No"}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    appendMessage(createMessage("user", selectedCabinLines));

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

    const selectedFlight = flights.find((flight) => flight.id === flightId);
    if (selectedFlight) {
      updateBookingMemory((current) => ({
        ...current,
        selections: {
          ...current.selections,
          flight: {
            id: selectedFlight.id,
            priceEur: selectedFlight.priceEur * passengers,
          },
        },
        trip: {
          ...current.trip,
          origin: selectedFlight.origin,
          destination: selectedFlight.destination,
        },
      }));
    }

    try {
      await transportRef.current?.sendEvent({
        type: "ui.flightSelected",
        payload: {
          flightId,
        },
      });

      setShowDatePicker(false);
      setShowCabinSelector(false);
      setShowCarSelector(false);
      setShowHotelSelector(false);
      setShowHotelCarSelector(false);
      setQuickOptions(null);
      setPartyConfig(defaultPartySelectorConfig);
      setShowPartySelector(true);

      appendMessage(
        createMessage(
          "agent",
          "Perfecto, ya tengo tu ferry seleccionado. Antes de seguir, confirma pasajeros y si viajas con mascota.",
        ),
      );
    } catch {
      setPanelError("No fue posible registrar la selección del vuelo.");
    }
  };

  const onSelectQuickOption = async (option: string) => {
    if (!quickOptionsFlowMode || !quickOptions) {
      return;
    }

    if (hasCompletedPayment) {
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      appendMessage(createMessage("agent", "Tu reserva ya esta pagada, asi que no voy a anadir nuevos servicios ahora."));
      return;
    }

    const addUserQuickOptionMessage = () => {
      appendMessage(createMessage("user", option));
    };

    if (quickOptionsFlowMode === "upsell-primary") {
      if (option === "Hotel y coche") {
        addUserQuickOptionMessage();
        const destinationLabel = destinationRef.current || "tu destino";
        setQuickOptions(buildUpsellNightsQuickOptions(destinationLabel));
        setQuickOptionsFlowMode("upsell-nights");
        return;
      }

      if (option === "Hotel en destino") {
        addUserQuickOptionMessage();
        const destinationLabel = destinationRef.current || "tu destino";
        setQuickOptions(buildHotelNightsQuickOptions(destinationLabel));
        setQuickOptionsFlowMode("hotel-nights");
        setShowCarSelector(false);
        setShowHotelCarSelector(false);
        return;
      }

      if (option === "Coche de alquiler") {
        addUserQuickOptionMessage();
        const destinationLabel = destinationRef.current || "tu destino";
        setQuickOptions(buildCarDaysQuickOptions(destinationLabel));
        setQuickOptionsFlowMode("car-rental-days");
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        return;
      }

      if (option === "No, gracias") {
        addUserQuickOptionMessage();
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
      addUserQuickOptionMessage();
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

    if (quickOptionsFlowMode === "hotel-nights") {
      addUserQuickOptionMessage();
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      setShowCarSelector(false);
      setShowHotelCarSelector(false);
      const destinationLabel = destinationRef.current || "tu destino";
      const nights = parseNightsFromLabel(option);
      setHotelStayNights(nights);
      setShowHotelSelector(true);
      setSentHotelSelectionId(null);
      setHotelOptions(featuredHotelRooms);
      appendMessage(createMessage("agent", `🏨 Perfecto. Te muestro 2 propuestas de habitacion para ${nights} ${nights === 1 ? "noche" : "noches"} en ${destinationLabel}.`));
      return;
    }

    if (quickOptionsFlowMode === "car-rental-days") {
      addUserQuickOptionMessage();
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      setShowHotelSelector(false);
      setShowHotelCarSelector(false);
      const destinationLabel = destinationRef.current || "tu destino";
      const days = parseNightsFromLabel(option);
      setCarRentalDays(days);
      setShowCarSelector(true);
      setSentCarSelectionId(null);
      setCarOptions(featuredCars);
      appendMessage(createMessage("agent", `🚗 Perfecto. Te muestro 2 opciones de coche para ${days} ${days === 1 ? "dia" : "dias"} en ${destinationLabel}.`));
      return;
    }

    if (quickOptionsFlowMode === "hotel-post-car") {
      addUserQuickOptionMessage();
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);

      if (option === "Si, quiero coche") {
        const destinationLabel = destinationRef.current || "tu destino";
        setShowHotelSelector(false);
        setShowHotelCarSelector(false);
        setQuickOptions(buildCarDaysQuickOptions(destinationLabel));
        setQuickOptionsFlowMode("car-rental-days");
        return;
      }

      appendMessage(createMessage("agent", "👌 Perfecto. Dejamos solo hotel en destino por ahora."));
      setShowCheckoutPrompt(true);
      setShowBudgetSummary(false);
      setBudgetSnapshot(null);
      return;
    }

    if (quickOptionsFlowMode === "car-post-hotel") {
      addUserQuickOptionMessage();
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);

      if (option === "Si, quiero hotel") {
        const destinationLabel = destinationRef.current || "tu destino";
        setShowCarSelector(false);
        setShowHotelCarSelector(false);
        setQuickOptions(buildHotelNightsQuickOptions(destinationLabel));
        setQuickOptionsFlowMode("hotel-nights");
        return;
      }

      if (option === "Continuar a pago" || option === "No, gracias") {
        appendMessage(createMessage("agent", "👌 Perfecto. Continuamos con el pago de tu reserva actual."));
      }
      setShowCheckoutPrompt(true);
      setShowBudgetSummary(false);
      setBudgetSnapshot(null);
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

    updateBookingMemory((current) => ({
      ...current,
      selections: {
        ...current.selections,
        car: {
          id: selectedCar.id,
          priceEur: selectedCar.pricePerDayEur * carRentalDays,
          basis: "day",
          days: carRentalDays,
          unitPriceEur: selectedCar.pricePerDayEur,
        },
      },
    }));

    setIsSendingCarSelection(true);
    setPanelError(null);

    appendMessage(
      createMessage(
        "user",
        `### Coche seleccionado\n- Modelo: ${selectedCar.name}\n- Tipo: ${selectedCar.category}\n- Transmision: ${selectedCar.transmission}\n- Duracion: ${carRentalDays} ${carRentalDays === 1 ? "dia" : "dias"}\n- Precio: ${selectedCar.pricePerDayEur} EUR/dia\n- Total estimado coche: ${selectedCar.pricePerDayEur * carRentalDays} EUR`,
      ),
    );
    appendMessage(
      createMessage(
        "agent",
        `Perfecto. Dejo anotado ${selectedCar.name} para tu llegada a ${destinationRef.current || "destino"}.`,
      ),
    );

    setShowBudgetSummary(false);
    setBudgetSnapshot(null);

    if (!sentHotelSelectionId) {
      setQuickOptions(buildPostCarHotelQuickOptions(destinationRef.current || "tu destino"));
      setQuickOptionsFlowMode("car-post-hotel");
      setShowCheckoutPrompt(false);
    } else {
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      setShowCheckoutPrompt(true);
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

    updateBookingMemory((current) => ({
      ...current,
      selections: {
        ...current.selections,
        hotel: {
          id: selectedHotel.id,
          priceEur: selectedHotel.nightPriceEur * hotelStayNights,
          basis: "night",
          nights: hotelStayNights,
          unitPriceEur: selectedHotel.nightPriceEur,
        },
      },
    }));

    setIsSendingHotelSelection(true);
    setPanelError(null);

    appendMessage(
      createMessage(
        "user",
        `### Habitacion seleccionada\n- Hotel: ${selectedHotel.hotelName}\n- Tipo: ${selectedHotel.roomName}\n- Regimen: ${selectedHotel.board}\n- Duracion: ${hotelStayNights} ${hotelStayNights === 1 ? "noche" : "noches"}\n- Precio: ${selectedHotel.nightPriceEur} EUR/noche\n- Total estimado hotel: ${selectedHotel.nightPriceEur * hotelStayNights} EUR`,
      ),
    );
    appendMessage(
      createMessage(
        "agent",
        `Perfecto. Dejo anotada la opcion ${selectedHotel.roomName} en ${selectedHotel.hotelName} para ${hotelStayNights} ${hotelStayNights === 1 ? "noche" : "noches"}.`,
      ),
    );

    const hotelSelectionSummary = [
      destinationRef.current && `Destino: ${destinationRef.current}`,
      `Hotel: ${selectedHotel.hotelName}`,
      `Habitacion: ${selectedHotel.roomName}`,
      `Noches: ${hotelStayNights}`,
      `Regimen: ${selectedHotel.board}`,
      `Precio total hotel: ${selectedHotel.nightPriceEur * hotelStayNights} EUR`,
      `Precio por noche: ${selectedHotel.nightPriceEur} EUR`,
    ]
      .filter(Boolean)
      .join(". ");

    try {
      await transportRef.current?.sendEvent({
        type: "ui.hotelSelected",
        payload: hotelSelectionSummary,
      });
    } catch {
      setPanelError("No se pudo enviar la seleccion del hotel al asistente.");
    }

    // If a car is already selected, continue to checkout; otherwise suggest adding a car.
    if (sentCarSelectionId) {
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      setShowCheckoutPrompt(true);
      setShowBudgetSummary(false);
      setBudgetSnapshot(null);
    } else {
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

    updateBookingMemory((current) => ({
      ...current,
      selections: {
        ...current.selections,
        hotelCarPackage: {
          id: selectedPack.id,
          totalPriceEur: selectedPack.totalPriceEur,
          title: selectedPack.title,
          nights: selectedPack.nights,
        },
      },
    }));

    setIsSendingHotelCarSelection(true);
    setPanelError(null);

    appendMessage(
      createMessage(
        "user",
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

  const onOpenPaymentSummary = () => {
    const snapshot = buildBudgetSummarySnapshot();
    setBudgetSnapshot(snapshot);
    setShowCheckoutPrompt(false);
    setShowBudgetSummary(true);
    setIsPaymentSuccess(false);
    setReservationCode(null);
    appendMessage(createMessage("agent", "Te comparto el detalle de tu presupuesto antes de pasar a pago seguro."));
  };

  const onCloseBudgetSummary = () => {
    setShowBudgetSummary(false);
    setIsPaymentSuccess(false);
    setReservationCode(null);
  };

  const onPayDemo = () => {
    const code = `TRS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    setReservationCode(code);
    setIsPaymentSuccess(true);
    setHasCompletedPayment(true);
    // Clear stale inline selectors/cards so post-payment chat does not reopen ferry choices.
    setFlights([]);
    setSelectedFlightId(undefined);
    setShowDatePicker(false);
    setShowPartySelector(false);
    setShowCabinSelector(false);
    setShowCarSelector(false);
    setShowHotelSelector(false);
    setShowHotelCarSelector(false);
    setQuickOptions(null);
    setQuickOptionsFlowMode(null);
    appendMessage(createMessage("agent", `Pago demo completado con exito. Tu codigo de reserva es ${code}.`));
  };

  const onKeepChatting = () => {
    setShowCheckoutPrompt(false);
    setShowBudgetSummary(false);
    setBudgetSnapshot(null);
    setIsPaymentSuccess(false);
    setReservationCode(null);

    if (hasCompletedPayment) {
      // Keep post-payment state clean: no extra selectors or previous ferry cards.
      setFlights([]);
      setSelectedFlightId(undefined);
      setShowDatePicker(false);
      setShowPartySelector(false);
      setShowCabinSelector(false);
      setShowCarSelector(false);
      setShowHotelSelector(false);
      setShowHotelCarSelector(false);
      setQuickOptions(null);
      setQuickOptionsFlowMode(null);
      return;
    }

    if (!sentHotelSelectionId) {
      setQuickOptions(buildPostCarHotelQuickOptions(destinationRef.current || "tu destino"));
      setQuickOptionsFlowMode("car-post-hotel");
      appendMessage(createMessage("agent", "Perfecto. Si quieres, puedo completar tu viaje con hotel en destino."));
      return;
    }

    appendMessage(createMessage("agent", "Perfecto, seguimos ajustando tu viaje."));
  };

  return (
    <FluentProvider theme={trasmedTheme}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerWaves} aria-hidden="true" />
          <div className={styles.headerBoat} aria-hidden="true" />
          <div className={styles.headerBrand}>
            <span className={styles.headerLogo} aria-hidden="true">
              <Image src="/ola-icon-transparent.png" alt="" width={32} height={32} priority={false} />
            </span>
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
                ) : showCheckoutPrompt ? (
                  <section className={styles.checkoutPromptPanel} aria-label="Opciones finales de reserva">
                    <p className={styles.checkoutPromptTitle}>Tu coche ya esta anadido a la reserva</p>
                    <p className={styles.checkoutPromptText}>Quieres revisar el presupuesto y continuar a pago seguro?</p>
                    <div className={styles.checkoutPromptActions}>
                      <button type="button" className={styles.checkoutPrimaryButton} onClick={onOpenPaymentSummary}>
                        Continuar a pago seguro
                      </button>
                      <button type="button" className={styles.checkoutSecondaryButton} onClick={onKeepChatting}>
                        Seguir hablando con Marea
                      </button>
                    </div>
                  </section>
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
                ) : flights.length > 0 ? (
                  <FlightCarousel
                    flights={flights}
                    selectedFlightId={selectedFlightId}
                    onSelectFlight={onSelectFlight}
                    nextAvailableDate={nextAvailableFerryDate}
                    passengers={passengers}
                  />
                ) : undefined
              }
            />
          </section>

          {showBudgetSummary && budgetSnapshot && (
            <div
              className={styles.budgetModalBackdrop}
              role="dialog"
              aria-modal="true"
              aria-label="Detalle de presupuesto"
              onClick={onCloseBudgetSummary}
            >
              <section className={styles.budgetSummaryPanel} onClick={(event) => event.stopPropagation()}>
                <div className={styles.budgetSummaryHeader}>
                  <div className={styles.budgetSummaryHeaderLeft}>
                    <span className={styles.budgetSummaryIcon}>🧾</span>
                    <p className={styles.budgetSummaryTitle}>{isPaymentSuccess ? "Pago exitoso" : "Tu presupuesto"}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.budgetSummaryClose}
                    aria-label="Cerrar presupuesto"
                    onClick={onCloseBudgetSummary}
                  >
                    ×
                  </button>
                </div>
                {isPaymentSuccess ? (
                  <div className={styles.paymentSuccessBlock}>
                    <p className={styles.paymentSuccessText}>Tu reserva ha sido confirmada correctamente.</p>
                    <p className={styles.paymentSuccessCodeLabel}>Codigo de reserva</p>
                    <p className={styles.paymentSuccessCode}>{reservationCode}</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.budgetSummaryLines}>
                      {budgetSnapshot.lines.map((line) => (
                        <div key={line.label} className={styles.budgetSummaryLine}>
                          <span>{line.label}</span>
                          <span>{formatEur(line.amountEur)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.budgetSummaryTotals}>
                      <div className={styles.budgetSummaryLine}>
                        <span>Subtotal</span>
                        <span>{formatEur(budgetSnapshot.subtotalEur)}</span>
                      </div>
                      <div className={`${styles.budgetSummaryLine} ${styles.budgetSummaryDiscount}`}>
                        <span>Descuento (10%)</span>
                        <span>-{formatEur(budgetSnapshot.discountEur)}</span>
                      </div>
                      <div className={`${styles.budgetSummaryLine} ${styles.budgetSummaryTotal}`}>
                        <span>Total</span>
                        <span>{formatEur(budgetSnapshot.totalEur)}</span>
                      </div>
                    </div>
                  </>
                )}
                <div className={styles.checkoutPromptActions}>
                  {!isPaymentSuccess ? (
                    <button type="button" className={styles.checkoutPrimaryButton} onClick={onPayDemo}>
                      Pagar (demo)
                    </button>
                  ) : (
                    <button type="button" className={styles.checkoutPrimaryButton} onClick={onKeepChatting}>
                      Volver al chat
                    </button>
                  )}
                  <button type="button" className={styles.checkoutSecondaryButton} onClick={onKeepChatting}>
                    Seguir hablando con Marea
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </FluentProvider>
  );
}
