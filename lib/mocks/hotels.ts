import { carCatalog, type RentalCar } from "./cars";

export interface HotelRoomOption {
  id: string;
  hotelName: string;
  roomName: string;
  stars: number;
  board: "Alojamiento" | "Desayuno incluido";
  cancellation: "Flexible" | "No reembolsable";
  nightPriceEur: number;
  image: {
    src: string;
    alt: string;
  };
  tags: string[];
  features: string[];
  description: string;
}

export interface HotelCarPackage {
  id: string;
  title: string;
  nights: number;
  hotel: HotelRoomOption;
  car: RentalCar;
  totalPriceEur: number;
  savingsLabel?: string;
}

export const featuredHotelRooms: HotelRoomOption[] = [
  {
    id: "mar-blau-double-sea",
    hotelName: "Hotel Mar Blau Ibiza",
    roomName: "Habitacion doble vista mar",
    stars: 4,
    board: "Desayuno incluido",
    cancellation: "Flexible",
    nightPriceEur: 139,
    image: {
      src: "/images/cabins/exterior-pet-friendly/01-dormitorio.png",
      alt: "Habitacion doble con cama grande y decoracion luminosa",
    },
    tags: ["Top valorado", "Cerca de playa"],
    features: ["20 m2", "Balcon", "Wifi", "Aire acondicionado"],
    description: "Ideal para escapada en pareja, a 8 minutos andando de la playa.",
  },
  {
    id: "port-ibiza-junior-suite",
    hotelName: "Port Ibiza Suites",
    roomName: "Junior suite familiar",
    stars: 4,
    board: "Alojamiento",
    cancellation: "Flexible",
    nightPriceEur: 168,
    image: {
      src: "/images/cabins/exterior-pet-friendly/02-ventana.png",
      alt: "Habitacion suite con zona de estar y ventanal",
    },
    tags: ["Mas espacio", "Centro ciudad"],
    features: ["30 m2", "Zona de estar", "Kitchenette", "Check-out tardio"],
    description: "Suite amplia para viajar con mas comodidad y servicios premium.",
  },
];

export const buildHotelCarPackages = (nights: number): HotelCarPackage[] => {
  const compact = carCatalog["ibiza-compact"];
  const suv = carCatalog["ibiza-suv-auto"];

  const optionAHotel = featuredHotelRooms[0];
  const optionBHotel = featuredHotelRooms[1];

  const optionATotal = optionAHotel.nightPriceEur * nights + compact.pricePerDayEur * nights;
  const optionBTotal = optionBHotel.nightPriceEur * nights + suv.pricePerDayEur * nights;

  return [
    {
      id: "pack-marblau-compact",
      title: "Pack Smart Ibiza",
      nights,
      hotel: optionAHotel,
      car: compact,
      totalPriceEur: optionATotal,
      savingsLabel: "Ahorro 8% frente a compra separada",
    },
    {
      id: "pack-portibiza-suv",
      title: "Pack Comfort Ibiza",
      nights,
      hotel: optionBHotel,
      car: suv,
      totalPriceEur: optionBTotal,
      savingsLabel: "Incluye cancelacion flexible",
    },
  ];
};
