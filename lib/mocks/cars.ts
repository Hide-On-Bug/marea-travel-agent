export interface RentalCar {
  id: string;
  name: string;
  category: string;
  seats: number;
  transmission: "Manual" | "Automatico";
  fuel: "Gasolina" | "Hibrido" | "Electrico";
  luggage: number;
  pricePerDayEur: number;
  petFriendly: boolean;
  tags: string[];
}

export const carCatalog: Record<string, RentalCar> = {
  "ibiza-compact": {
    id: "ibiza-compact",
    name: "Seat Ibiza o similar",
    category: "Compacto",
    seats: 5,
    transmission: "Manual",
    fuel: "Gasolina",
    luggage: 2,
    pricePerDayEur: 39,
    petFriendly: true,
    tags: ["Mejor precio", "Recogida en puerto"],
  },
  "ibiza-suv-auto": {
    id: "ibiza-suv-auto",
    name: "Peugeot 3008 o similar",
    category: "SUV",
    seats: 5,
    transmission: "Automatico",
    fuel: "Hibrido",
    luggage: 3,
    pricePerDayEur: 62,
    petFriendly: true,
    tags: ["Mas espacio", "Cancelacion flexible"],
  },
};

export const featuredCars: RentalCar[] = [
  carCatalog["ibiza-compact"],
  carCatalog["ibiza-suv-auto"],
];
