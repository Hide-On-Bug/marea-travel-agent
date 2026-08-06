import { describe, expect, it } from "vitest";
import {
  agentToUiEventSchema,
  showCabinSelectorActivityValueSchema,
  showDatePickerActivityValueSchema,
  showTravelPartySelectorActivityValueSchema,
  uiToAgentEventSchema,
} from "@/lib/agent/eventSchemas";

describe("eventSchemas", () => {
  it("accepts a valid ui.showFlights event", () => {
    const event = {
      type: "ui.showFlights",
      payload: {
        destination: "Roma",
        fromDate: "2026-10-12",
        toDate: "2026-10-18",
        flights: [
          {
            id: "AZ-1",
            airline: "ITA Airways",
            origin: "MAD",
            destination: "FCO",
            departureTime: "08:00",
            arrivalTime: "10:10",
            duration: "2h 10m",
            stops: 0,
            priceEur: 199,
          },
        ],
      },
    };

    expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
  });

  it("accepts a valid ui.showCars event", () => {
    const event = {
      type: "ui.showCars",
      payload: {
        destination: "Ibiza",
        days: 5,
        title: "Te muestro opciones de coche para 5 dias en Ibiza",
        cars: [
          {
            id: "car-economico",
            name: "Fiat 500 o similar",
            category: "Economico",
            transmission: "Manual",
            pricePerDayEur: 45,
          },
        ],
      },
    };

    expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
  });

  it("accepts a valid ui.showHotels event", () => {
    const event = {
      type: "ui.showHotels",
      payload: {
        destination: "Ibiza",
        nights: 7,
        title: "Te muestro 2 opciones de hotel para 7 noches en Ibiza",
        hotels: [
          {
            id: "mar-blau-double-sea",
            hotelName: "Hotel Mar Blau Ibiza",
            roomName: "Habitacion doble vista mar",
            nightPriceEur: 139,
          },
        ],
      },
    };

    expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
  });

  it("rejects HTML in ui.showMessage", () => {
    const event = {
      type: "ui.showMessage",
      payload: { text: "<b>unsafe</b>" },
    };

    expect(() => agentToUiEventSchema.parse(event)).toThrow();
  });

  it("rejects unknown event types", () => {
    const event = {
      type: "ui.unknown",
      payload: {},
    };

    expect(() => uiToAgentEventSchema.parse(event)).toThrow();
  });

  // --- ui.showDatePicker ---

  describe("showDatePickerActivityValueSchema", () => {
    it("accepts a valid DirectLine showDatePicker value", () => {
      const value = {
        origin: "Valencia",
        destination: "Ibiza",
        minDate: "2026-07-15",
        mode: "range",
      };
      expect(() => showDatePickerActivityValueSchema.parse(value)).not.toThrow();
    });

    it("rejects payload without origin", () => {
      const value = {
        destination: "Ibiza",
        minDate: "2026-07-15",
        mode: "range",
      };
      expect(() => showDatePickerActivityValueSchema.parse(value)).toThrow();
    });

    it("rejects payload with invalid minDate format", () => {
      const value = {
        origin: "Valencia",
        destination: "Ibiza",
        minDate: "15-07-2026",  // formato incorrecto
        mode: "range",
      };
      expect(() => showDatePickerActivityValueSchema.parse(value)).toThrow();
    });

    it("rejects payload with wrong mode value", () => {
      const value = {
        origin: "Valencia",
        destination: "Ibiza",
        minDate: "2026-07-15",
        mode: "single",
      };
      expect(() => showDatePickerActivityValueSchema.parse(value)).toThrow();
    });
  });

  describe("agentToUiEventSchema — ui.showDatePicker", () => {
    it("accepts showDatePicker with DirectLine fields", () => {
      const event = {
        type: "ui.showDatePicker",
        payload: {
          destination: "Ibiza",
          origin: "Valencia",
          minDate: "2026-07-15",
          mode: "range",
        },
      };
      expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
    });

    it("accepts showDatePicker with only Mock-compat fields (hint)", () => {
      const event = {
        type: "ui.showDatePicker",
        payload: {
          destination: "Roma",
          hint: "Selecciona fecha de ida y vuelta",
        },
      };
      expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
    });

    it("rejects showDatePicker without destination", () => {
      const event = {
        type: "ui.showDatePicker",
        payload: {
          origin: "Valencia",
          minDate: "2026-07-15",
          mode: "range",
        },
      };
      expect(() => agentToUiEventSchema.parse(event)).toThrow();
    });
  });

  // --- ui.datesSelected ---

  describe("uiToAgentEventSchema — ui.datesSelected", () => {
    it("accepts a valid datesSelected event", () => {
      const event = {
        type: "ui.datesSelected",
        payload: {
          origin: "Valencia",
          destination: "Ibiza",
          fromDate: "2026-07-20",
          toDate: "2026-07-27",
        },
      };
      expect(() => uiToAgentEventSchema.parse(event)).not.toThrow();
    });

    it("rejects datesSelected with invalid date format", () => {
      const event = {
        type: "ui.datesSelected",
        payload: {
          origin: "Valencia",
          destination: "Ibiza",
          fromDate: "20-07-2026",
          toDate: "27-07-2026",
        },
      };
      expect(() => uiToAgentEventSchema.parse(event)).toThrow();
    });

    it("rejects datesSelected missing destination", () => {
      const event = {
        type: "ui.datesSelected",
        payload: {
          origin: "Valencia",
          fromDate: "2026-07-20",
          toDate: "2026-07-27",
        },
      };
      expect(() => uiToAgentEventSchema.parse(event)).toThrow();
    });
  });

  // --- ui.showTravelPartySelector ---

  describe("showTravelPartySelectorActivityValueSchema", () => {
    it("accepts a valid payload", () => {
      expect(() => showTravelPartySelectorActivityValueSchema.parse({
        minPassengers: 1, maxPassengers: 4, defaultPassengers: 2, allowPets: true,
      })).not.toThrow();
    });

    it("rejects non-boolean allowPets", () => {
      expect(() => showTravelPartySelectorActivityValueSchema.parse({
        minPassengers: 1, maxPassengers: 4, defaultPassengers: 2, allowPets: "yes",
      })).toThrow();
    });

    it("rejects zero minPassengers", () => {
      expect(() => showTravelPartySelectorActivityValueSchema.parse({
        minPassengers: 0, maxPassengers: 4, defaultPassengers: 2, allowPets: true,
      })).toThrow();
    });
  });

  describe("agentToUiEventSchema — ui.showTravelPartySelector", () => {
    it("accepts a valid showTravelPartySelector event", () => {
      const event = {
        type: "ui.showTravelPartySelector",
        payload: { minPassengers: 1, maxPassengers: 4, defaultPassengers: 2, allowPets: true },
      };
      expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
    });

    it("rejects showTravelPartySelector without allowPets", () => {
      const event = {
        type: "ui.showTravelPartySelector",
        payload: { minPassengers: 1, maxPassengers: 4, defaultPassengers: 2 },
      };
      expect(() => agentToUiEventSchema.parse(event)).toThrow();
    });
  });

  // --- ui.showCabinSelector ---

  describe("showCabinSelectorActivityValueSchema", () => {
    it("accepts a valid cabinId", () => {
      expect(() => showCabinSelectorActivityValueSchema.parse({
        cabinId: "exterior-pet-friendly",
      })).not.toThrow();
    });

    it("rejects empty cabinId", () => {
      expect(() => showCabinSelectorActivityValueSchema.parse({ cabinId: "" })).toThrow();
    });

    it("rejects missing cabinId", () => {
      expect(() => showCabinSelectorActivityValueSchema.parse({})).toThrow();
    });
  });

  describe("agentToUiEventSchema — ui.showCabinSelector", () => {
    it("accepts a valid showCabinSelector event", () => {
      const event = {
        type: "ui.showCabinSelector",
        payload: { cabinId: "exterior-pet-friendly" },
      };
      expect(() => agentToUiEventSchema.parse(event)).not.toThrow();
    });
  });

  // --- ui.travelPartySelected / ui.cabinSelected ---

  describe("uiToAgentEventSchema — ui.travelPartySelected", () => {
    it("accepts a valid travelPartySelected event", () => {
      const event = {
        type: "ui.travelPartySelected",
        payload: { passengers: 2, hasPets: true },
      };
      expect(() => uiToAgentEventSchema.parse(event)).not.toThrow();
    });

    it("rejects zero passengers", () => {
      const event = {
        type: "ui.travelPartySelected",
        payload: { passengers: 0, hasPets: false },
      };
      expect(() => uiToAgentEventSchema.parse(event)).toThrow();
    });
  });

  describe("uiToAgentEventSchema — ui.cabinSelected", () => {
    it("accepts a valid cabinSelected event", () => {
      const event = {
        type: "ui.cabinSelected",
        payload: "Camarote: Camarote exterior pet friendly.",
      };
      expect(() => uiToAgentEventSchema.parse(event)).not.toThrow();
    });

    it("rejects cabinSelected with an empty summary", () => {
      const event = {
        type: "ui.cabinSelected",
        payload: "",
      };
      expect(() => uiToAgentEventSchema.parse(event)).toThrow();
    });

    it("rejects cabinSelected object payloads", () => {
      const event = {
        type: "ui.cabinSelected",
        payload: {
          cabinId: "exterior-pet-friendly",
          cabinName: "Camarote exterior pet friendly",
          deck: 8,
          price: 95,
          currency: "EUR",
          petFriendly: true,
        },
      };
      expect(() => uiToAgentEventSchema.parse(event)).toThrow();
    });
  });

  describe("uiToAgentEventSchema — ui.hotelSelected", () => {
    it("accepts a valid hotelSelected event", () => {
      const event = {
        type: "ui.hotelSelected",
        payload: "Destino: Ibiza. Hotel: Mar Blau. Habitacion: Doble.",
      };
      expect(() => uiToAgentEventSchema.parse(event)).not.toThrow();
    });

    it("rejects hotelSelected with an empty summary", () => {
      const event = {
        type: "ui.hotelSelected",
        payload: "",
      };
      expect(() => uiToAgentEventSchema.parse(event)).toThrow();
    });
  });
});
