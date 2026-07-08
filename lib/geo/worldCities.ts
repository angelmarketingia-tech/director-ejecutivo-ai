/**
 * Principales ciudades por país, para la búsqueda AUTOMÁTICA de leads a nivel mundial.
 * El buscador recorre estas ciudades con el mismo nicho y acumula resultados (sin duplicados).
 * Si un país no está en la lista, se busca el país como una sola consulta.
 */
export const WORLD_CITIES: Record<string, string[]> = {
  Colombia: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Santa Marta", "Cúcuta", "Ibagué", "Villavicencio", "Manizales", "Neiva", "Armenia", "Montería"],
  México: ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Querétaro", "Mérida", "Cancún", "Toluca", "Ciudad Juárez", "San Luis Potosí", "Aguascalientes", "Culiacán", "Chihuahua"],
  Argentina: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "San Miguel de Tucumán", "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Neuquén", "Bariloche"],
  Chile: ["Santiago", "Valparaíso", "Concepción", "Viña del Mar", "Antofagasta", "Temuco", "La Serena", "Rancagua", "Iquique", "Puerto Montt"],
  Perú: ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Cusco", "Huancayo", "Tacna", "Iquitos", "Chimbote"],
  Ecuador: ["Quito", "Guayaquil", "Cuenca", "Santo Domingo", "Ambato", "Manta", "Machala", "Loja", "Riobamba", "Ibarra"],
  España: ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma", "Bilbao", "Alicante", "Granada", "Vigo", "Valladolid"],
  "Estados Unidos": ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Dallas", "Phoenix", "San Antonio", "San Diego", "Atlanta", "Denver", "Orlando", "Las Vegas"],
  Venezuela: ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay", "Ciudad Guayana", "Maturín", "Barcelona", "San Cristóbal"],
  Guatemala: ["Ciudad de Guatemala", "Quetzaltenango", "Escuintla", "Villa Nueva", "Mixco", "Cobán", "Antigua Guatemala"],
  "Costa Rica": ["San José", "Alajuela", "Cartago", "Heredia", "Liberia", "Puntarenas", "Limón"],
  Panamá: ["Ciudad de Panamá", "San Miguelito", "Colón", "David", "Santiago", "Chitré"],
  "República Dominicana": ["Santo Domingo", "Santiago de los Caballeros", "La Romana", "San Pedro de Macorís", "Puerto Plata", "Punta Cana"],
  Uruguay: ["Montevideo", "Salto", "Ciudad de la Costa", "Paysandú", "Las Piedras", "Maldonado", "Punta del Este"],
  Paraguay: ["Asunción", "Ciudad del Este", "San Lorenzo", "Luque", "Capiatá", "Encarnación"],
  Bolivia: ["La Paz", "Santa Cruz de la Sierra", "Cochabamba", "El Alto", "Sucre", "Oruro", "Tarija"],
  Brasil: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Curitiba", "Recife", "Porto Alegre", "Manaus"],
  Portugal: ["Lisboa", "Porto", "Braga", "Coimbra", "Faro", "Funchal", "Aveiro"],
};

/** Lista ordenada de países soportados (para el selector). */
export const COUNTRIES: string[] = Object.keys(WORLD_CITIES);

/** Ciudades a recorrer para un país; si no está mapeado, usa el país como única consulta. */
export function citiesFor(country: string): string[] {
  const c = (country || "").trim();
  return WORLD_CITIES[c] ?? (c ? [c] : []);
}
