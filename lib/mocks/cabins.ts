export interface CabinImage {
  src: string;
  alt: string;
}

export interface Cabin {
  id: string;
  name: string;
  capacity: number;
  deck: number;
  beds: string;
  priceDelta: number;
  petFriendly: boolean;
  availability: number;
  tags: string[];
  features: string[];
  images: CabinImage[];
}

export const petFriendlyCabin: Cabin = {
  id: "exterior-pet-friendly",
  name: "Camarote exterior pet friendly",
  capacity: 4,
  deck: 8,
  beds: "2 camas individuales",
  priceDelta: 95,
  petFriendly: true,
  availability: 1,
  tags: ["Pet friendly", "Último disponible"],
  features: [
    "Ventana al mar",
    "Baño privado",
    "Climatización",
    "Admite mascotas",
    "Kit pet friendly",
  ],
  images: [
    { src: "/images/cabins/exterior-pet-friendly/01-dormitorio.png", alt: "Dormitorio del camarote" },
    { src: "/images/cabins/exterior-pet-friendly/02-ventana.png",    alt: "Ventana al mar" },
    { src: "/images/cabins/exterior-pet-friendly/03-bano.png",       alt: "Baño privado" },
  ],
};

export const standardExteriorCabin: Cabin = {
  id: "exterior-standard",
  name: "Camarote exterior",
  capacity: 4,
  deck: 8,
  beds: "2 camas individuales",
  priceDelta: 75,
  petFriendly: false,
  availability: 2,
  tags: ["Exterior", "Disponibilidad alta"],
  features: [
    "Ventana al mar",
    "Baño privado",
    "Climatización",
    "Zona tranquila",
  ],
  images: [
    { src: "/images/cabins/exterior-pet-friendly/01-dormitorio.png", alt: "Dormitorio del camarote" },
    { src: "/images/cabins/exterior-pet-friendly/02-ventana.png",    alt: "Ventana al mar" },
    { src: "/images/cabins/exterior-pet-friendly/03-bano.png",       alt: "Baño privado" },
  ],
};

export const cabinCatalog: Record<string, Cabin> = {
  "exterior-standard": standardExteriorCabin,
  "exterior-pet-friendly": petFriendlyCabin,
};
