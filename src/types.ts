export type Status = 'visited' | 'planned';

export interface Place {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  cities: string[];
  status: Status;
  date: string;
  /** Конец интервала посещения; '' — одна дата или дата не указана */
  dateTo: string;
  description: string;
  photos: string[];
  createdAt: string;
}

export interface NewPlace {
  name: string;
  country: string;
  lat: number;
  lng: number;
  cities: string[];
  status: Status;
  date: string;
  dateTo: string;
  description: string;
}

export type PlaceUpdate = Partial<Pick<Place, 'name' | 'country' | 'cities' | 'status' | 'date' | 'dateTo' | 'description'>>;
