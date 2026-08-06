import { z } from "zod";

const noHtml = (value: string) => !/<[^>]+>/.test(value);
const MAX_AGENT_MESSAGE_LENGTH = 4000;

export const flightOptionSchema = z.object({
  id: z.string().min(1),
  airline: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: z.string().min(1),
  arrivalTime: z.string().min(1),
  duration: z.string().min(1),
  stops: z.number().int().min(0),
  priceEur: z.number().positive(),
});

/**
 * Schema para validar el campo `value` de una actividad DirectLine de tipo
 * event / name === "ui.showDatePicker". Formato estricto enviado por Copilot Studio.
 */
export const showDatePickerActivityValueSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  minDate: z.string().date(),
  mode: z.literal("range"),
});

/**
 * Schema para validar el campo `value` de la actividad DirectLine
 * event / name === "ui.showTravelPartySelector".
 */
export const showTravelPartySelectorActivityValueSchema = z.object({
  minPassengers: z.number().int().min(1),
  maxPassengers: z.number().int().min(1),
  defaultPassengers: z.number().int().min(1),
  allowPets: z.boolean(),
});

/**
 * Schema para validar el campo `value` de la actividad DirectLine
 * event / name === "ui.showCabinSelector".
 */
export const showCabinSelectorActivityValueSchema = z.object({
  cabinId: z.string().min(1),
});

/**
 * Schema para validar el campo `value` de la actividad DirectLine
 * event / name === "ui.showQuickOptions".
 */
export const showQuickOptionsActivityValueSchema = z.object({
  title: z.string().min(1).optional(),
  options: z.array(z.string().min(1)).min(1).max(8),
});

/**
 * Schema para validar el campo `value` de la actividad DirectLine
 * event / name === "ui.showFlights".
 */
export const showFlightsActivityValueSchema = z.object({
  destination: z.string().min(1),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  flights: z.array(flightOptionSchema).min(1),
});

export const carOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  transmission: z.string().min(1),
  pricePerDayEur: z.number().positive(),
  imageSrc: z.string().min(1).optional(),
  imageAlt: z.string().min(1).optional(),
  seats: z.number().int().min(1).optional(),
  fuel: z.enum(["Gasolina", "Hibrido", "Electrico"]).optional(),
  luggage: z.number().int().min(0).optional(),
  petFriendly: z.boolean().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const showCarsActivityValueSchema = z.object({
  destination: z.string().min(1),
  days: z.number().int().min(1),
  title: z.string().min(1).optional(),
  cars: z.array(carOptionSchema).min(1),
});

export const hotelOptionSchema = z.object({
  id: z.string().min(1),
  hotelName: z.string().min(1),
  roomName: z.string().min(1),
  stars: z.number().int().min(1).max(5).optional(),
  board: z.enum(["Alojamiento", "Desayuno incluido"]).optional(),
  cancellation: z.enum(["Flexible", "No reembolsable"]).optional(),
  nightPriceEur: z.number().positive(),
  image: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
  }).optional(),
  tags: z.array(z.string().min(1)).optional(),
  features: z.array(z.string().min(1)).optional(),
  description: z.string().min(1).optional(),
});

export const showHotelsActivityValueSchema = z.object({
  destination: z.string().min(1),
  nights: z.number().int().min(1),
  title: z.string().min(1).optional(),
  hotels: z.array(hotelOptionSchema).min(1),
});

export const agentToUiEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ui.showDatePicker"),
    payload: z.object({
      destination: z.string().min(1),
      hint: z.string().optional(),
      origin: z.string().optional(),
      minDate: z.string().date().optional(),
      mode: z.literal("range").optional(),
    }),
  }),
  z.object({
    type: z.literal("ui.showFlights"),
    payload: z.object({
      destination: z.string().min(1),
      fromDate: z.string().date(),
      toDate: z.string().date(),
      flights: z.array(flightOptionSchema).min(1),
    }),
  }),
  z.object({
    type: z.literal("ui.showCars"),
    payload: showCarsActivityValueSchema,
  }),
  z.object({
    type: z.literal("ui.showHotels"),
    payload: showHotelsActivityValueSchema,
  }),
  z.object({
    type: z.literal("ui.showMessage"),
    payload: z.object({
      text: z
        .string()
        .min(1)
        .max(MAX_AGENT_MESSAGE_LENGTH)
        .refine(noHtml, "Agent messages cannot contain HTML."),
    }),
  }),
  z.object({
    type: z.literal("ui.showQuickOptions"),
    payload: showQuickOptionsActivityValueSchema,
  }),
  z.object({
    type: z.literal("ui.showTravelPartySelector"),
    payload: showTravelPartySelectorActivityValueSchema,
  }),
  z.object({
    type: z.literal("ui.showCabinSelector"),
    payload: showCabinSelectorActivityValueSchema,
  }),
]);

export const uiToAgentEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ui.datesSelected"),
    payload: z.object({
      origin: z.string().min(1),
      destination: z.string().min(1),
      fromDate: z.string().date(),
      toDate: z.string().date(),
    }),
  }),
  z.object({
    type: z.literal("ui.flightSelected"),
    payload: z.object({
      flightId: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("ui.travelPartySelected"),
    payload: z.object({
      passengers: z.number().int().min(1),
      hasPets: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal("ui.cabinSelected"),
    payload: z.string().min(1),
  }),
  z.object({
    type: z.literal("ui.hotelSelected"),
    payload: z.string().min(1),
  }),
]);

export type AgentToUiEventSchema = z.infer<typeof agentToUiEventSchema>;
export type UiToAgentEventSchema = z.infer<typeof uiToAgentEventSchema>;
export type ShowDatePickerActivityValue = z.infer<typeof showDatePickerActivityValueSchema>;
export type ShowTravelPartySelectorActivityValue = z.infer<typeof showTravelPartySelectorActivityValueSchema>;
export type ShowCabinSelectorActivityValue = z.infer<typeof showCabinSelectorActivityValueSchema>;
export type ShowQuickOptionsActivityValue = z.infer<typeof showQuickOptionsActivityValueSchema>;
export type ShowFlightsActivityValue = z.infer<typeof showFlightsActivityValueSchema>;
export type ShowCarsActivityValue = z.infer<typeof showCarsActivityValueSchema>;
export type ShowHotelsActivityValue = z.infer<typeof showHotelsActivityValueSchema>;
