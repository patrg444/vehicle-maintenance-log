import { useState, useEffect, useCallback } from 'react';
import { Vehicle, ServiceEntry, Reminder } from '@/app/types';
import { useAuth } from './AuthContext';
import * as db from './database';
import { supabase } from './supabase';

export function useData() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) {
      setVehicles([]);
      setServices([]);
      setReminders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [vehiclesData, servicesData, remindersData] = await Promise.all([
        db.getVehicles(),
        db.getServices(),
        db.getReminders(),
      ]);
      setVehicles(vehiclesData);
      setServices(servicesData);
      setReminders(remindersData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and subscribe to real-time changes
  useEffect(() => {
    fetchData();

    if (!user) return;

    // Subscribe to real-time changes
    const vehiclesSubscription = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchData();
      })
      .subscribe();

    const servicesSubscription = supabase
      .channel('services-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchData();
      })
      .subscribe();

    const remindersSubscription = supabase
      .channel('reminders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      vehiclesSubscription.unsubscribe();
      servicesSubscription.unsubscribe();
      remindersSubscription.unsubscribe();
    };
  }, [user, fetchData]);

  // Vehicle operations
  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle = await db.createVehicle(vehicle);
    setVehicles(prev => [newVehicle, ...prev]);
    return newVehicle;
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    const updated = await db.updateVehicle(id, updates);
    setVehicles(prev => prev.map(v => v.id === id ? updated : v));
    return updated;
  };

  const deleteVehicle = async (id: string) => {
    await db.deleteVehicle(id);
    setVehicles(prev => prev.filter(v => v.id !== id));
    // Also remove associated services and reminders from local state
    setServices(prev => prev.filter(s => s.vehicleId !== id));
    setReminders(prev => prev.filter(r => r.vehicleId !== id));
  };

  // Service operations
  const addService = async (service: Omit<ServiceEntry, 'id' | 'receipts'>, receipts?: File[]) => {
    const newService = await db.createService(service, receipts);
    setServices(prev => [newService, ...prev]);
    return newService;
  };

  const updateService = async (id: string, updates: Partial<ServiceEntry>) => {
    const updated = await db.updateService(id, updates);
    setServices(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const deleteService = async (id: string) => {
    await db.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  // Reminder operations
  const addReminder = async (reminder: Omit<Reminder, 'id'>) => {
    const newReminder = await db.createReminder(reminder);
    setReminders(prev => [newReminder, ...prev]);
    return newReminder;
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const updated = await db.updateReminder(id, updates);
    setReminders(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  };

  const deleteReminder = async (id: string) => {
    await db.deleteReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  // Batch update for reminders (used by setReminders in components)
  const setRemindersState = (newReminders: Reminder[] | ((prev: Reminder[]) => Reminder[])) => {
    setReminders(prev => {
      const updated = typeof newReminders === 'function' ? newReminders(prev) : newReminders;
      // Sync changes to database (fire and forget, but with error handling)
      Promise.all(
        updated.map(async (reminder) => {
          const original = prev.find(r => r.id === reminder.id);
          if (original && JSON.stringify(original) !== JSON.stringify(reminder)) {
            try {
              await db.updateReminder(reminder.id, reminder);
            } catch (error) {
              console.error('Failed to sync reminder update:', error);
            }
          }
        })
      ).catch(error => {
        console.error('Failed to sync reminder updates:', error);
      });
      return updated;
    });
  };

  return {
    vehicles,
    services,
    reminders,
    loading,
    error,
    refetch: fetchData,
    // Vehicles
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setVehicles,
    // Services
    addService,
    updateService,
    deleteService,
    setServices,
    // Reminders
    addReminder,
    updateReminder,
    deleteReminder,
    setReminders: setRemindersState,
  };
}
