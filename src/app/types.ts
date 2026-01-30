export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  odometerUnit: 'miles' | 'km';
  currentOdometer: number | null; // Allow null for "unknown"
  isArchived?: boolean; // Support archiving
}

export interface ServiceEntry {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number | null; // Allow null for "unknown"
  category: string;
  serviceType: string;
  notes: string;
  cost: number | null; // Allow null for "unknown"
  vendor: string;
  isDIY: boolean;
  receipts: Receipt[];
}

export interface Receipt {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  title: string;
  type: 'time' | 'mileage' | 'both';
  dueDate?: string;
  dueMileage?: number;
  intervalMonths?: number;
  intervalMiles?: number;
  lastCompleted?: string;
  lastCompletedOdometer?: number;
  isActive: boolean;
}

export const SERVICE_CATEGORIES = [
  'Oil Change',
  'Tires',
  'Brakes',
  'Engine',
  'Transmission',
  'Battery',
  'Filters',
  'Fluids',
  'Inspection',
  'Repair',
  'Other',
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];