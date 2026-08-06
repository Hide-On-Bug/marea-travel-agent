import type { FlightOption } from "@/lib/agent/eventTypes";

export const romeFlights: FlightOption[] = [
  {
    id: "TR-001",
    airline: "Trasmed",
    origin: "Valencia",
    destination: "Ibiza",
    departureTime: "09:00",
    arrivalTime: "14:10",
    duration: "5h 10m",
    stops: 0,
    priceEur: 79,
  },
  {
    id: "TR-017",
    airline: "Trasmed",
    origin: "Valencia",
    destination: "Ibiza",
    departureTime: "16:45",
    arrivalTime: "22:35",
    duration: "5h 50m",
    stops: 0,
    priceEur: 73,
  },
  {
    id: "TR-032",
    airline: "Trasmed",
    origin: "Valencia",
    destination: "Ibiza",
    departureTime: "22:30",
    arrivalTime: "04:35",
    duration: "6h 05m",
    stops: 0,
    priceEur: 69,
  },
];
