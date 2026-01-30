import { Vehicle, ServiceEntry, Reminder } from '@/app/types';

const STORAGE_KEYS = {
  VEHICLES: 'csb_vehicles',
  SERVICES: 'csb_services',
  REMINDERS: 'csb_reminders',
} as const;

// Vehicle storage
export const saveVehicles = (vehicles: Vehicle[]): void => {
  localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
};

export const loadVehicles = (): Vehicle[] => {
  const data = localStorage.getItem(STORAGE_KEYS.VEHICLES);
  return data ? JSON.parse(data) : [];
};

// Service entry storage
export const saveServices = (services: ServiceEntry[]): void => {
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
};

export const loadServices = (): ServiceEntry[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
  return data ? JSON.parse(data) : [];
};

// Reminder storage
export const saveReminders = (reminders: Reminder[]): void => {
  localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
};

export const loadReminders = (): Reminder[] => {
  const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  return data ? JSON.parse(data) : [];
};

// Clear all data
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.VEHICLES);
  localStorage.removeItem(STORAGE_KEYS.SERVICES);
  localStorage.removeItem(STORAGE_KEYS.REMINDERS);
};
