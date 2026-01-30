import { supabase, DbVehicle, DbService, DbReminder, DbReceipt } from './supabase';
import { Vehicle, ServiceEntry, Reminder, Receipt } from '@/app/types';

// Transform database types to app types
const toVehicle = (db: DbVehicle): Vehicle => ({
  id: db.id,
  make: db.make,
  model: db.model,
  year: db.year,
  vin: db.vin ?? undefined,
  odometerUnit: db.odometer_unit,
  currentOdometer: db.current_odometer,
  isArchived: db.is_archived,
});

const toServiceEntry = (db: DbService, receipts: Receipt[] = []): ServiceEntry => ({
  id: db.id,
  vehicleId: db.vehicle_id,
  date: db.date,
  odometer: db.odometer,
  category: db.category,
  serviceType: db.service_type,
  notes: db.notes ?? '',
  cost: db.cost,
  vendor: db.vendor ?? '',
  isDIY: db.is_diy,
  receipts,
});

const toReminder = (db: DbReminder): Reminder => ({
  id: db.id,
  vehicleId: db.vehicle_id,
  title: db.title,
  type: db.type,
  dueDate: db.due_date ?? undefined,
  dueMileage: db.due_mileage ?? undefined,
  intervalMonths: db.interval_months ?? undefined,
  intervalMiles: db.interval_miles ?? undefined,
  lastCompleted: db.last_completed ?? undefined,
  lastCompletedOdometer: db.last_completed_odometer ?? undefined,
  isActive: db.is_active,
});

// Vehicles
export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toVehicle);
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      user_id: user.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin || null,
      odometer_unit: vehicle.odometerUnit,
      current_odometer: vehicle.currentOdometer,
      is_archived: vehicle.isArchived || false,
    })
    .select()
    .single();

  if (error) throw error;
  return toVehicle(data);
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const dbUpdates: Partial<DbVehicle> = {};
  if (updates.make !== undefined) dbUpdates.make = updates.make;
  if (updates.model !== undefined) dbUpdates.model = updates.model;
  if (updates.year !== undefined) dbUpdates.year = updates.year;
  if (updates.vin !== undefined) dbUpdates.vin = updates.vin || null;
  if (updates.odometerUnit !== undefined) dbUpdates.odometer_unit = updates.odometerUnit;
  if (updates.currentOdometer !== undefined) dbUpdates.current_odometer = updates.currentOdometer;
  if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;

  const { data, error } = await supabase
    .from('vehicles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toVehicle(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

// Services
export async function getServices(): Promise<ServiceEntry[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  // Get receipts for each service
  const serviceIds = (data || []).map(s => s.id);
  const { data: receiptsData } = await supabase
    .from('receipts')
    .select('*')
    .in('service_id', serviceIds);

  const receiptsByService: Record<string, Receipt[]> = {};
  (receiptsData || []).forEach((r: DbReceipt) => {
    if (!receiptsByService[r.service_id]) {
      receiptsByService[r.service_id] = [];
    }
    receiptsByService[r.service_id].push({
      id: r.id,
      name: r.name,
      dataUrl: '', // Will be loaded on demand
      type: r.mime_type || '',
    });
  });

  return (data || []).map(s => toServiceEntry(s, receiptsByService[s.id] || []));
}

export async function createService(service: Omit<ServiceEntry, 'id' | 'receipts'>, receipts?: File[]): Promise<ServiceEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('services')
    .insert({
      user_id: user.id,
      vehicle_id: service.vehicleId,
      date: service.date,
      odometer: service.odometer,
      category: service.category,
      service_type: service.serviceType,
      notes: service.notes || null,
      cost: service.cost,
      vendor: service.vendor || null,
      is_diy: service.isDIY,
    })
    .select()
    .single();

  if (error) throw error;

  // Upload receipts if any
  const uploadedReceipts: Receipt[] = [];
  const failedUploads: string[] = [];
  if (receipts && receipts.length > 0) {
    for (const file of receipts) {
      const filePath = `${user.id}/${data.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        console.error(`Failed to upload receipt ${file.name}:`, uploadError);
        failedUploads.push(file.name);
        continue;
      }

      const { data: receiptData, error: dbError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          service_id: data.id,
          name: file.name,
          storage_path: filePath,
          mime_type: file.type,
        })
        .select()
        .single();

      if (dbError) {
        console.error(`Failed to save receipt record for ${file.name}:`, dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from('receipts').remove([filePath]);
        failedUploads.push(file.name);
        continue;
      }

      if (receiptData) {
        uploadedReceipts.push({
          id: receiptData.id,
          name: receiptData.name,
          dataUrl: '',
          type: receiptData.mime_type || '',
        });
      }
    }
  }

  // Log warning if some receipts failed to upload
  if (failedUploads.length > 0) {
    console.warn(`Failed to upload ${failedUploads.length} receipt(s): ${failedUploads.join(', ')}`);
  }

  return toServiceEntry(data, uploadedReceipts);
}

export async function updateService(id: string, updates: Partial<ServiceEntry>): Promise<ServiceEntry> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.odometer !== undefined) dbUpdates.odometer = updates.odometer;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.serviceType !== undefined) dbUpdates.service_type = updates.serviceType;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
  if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
  if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor || null;
  if (updates.isDIY !== undefined) dbUpdates.is_diy = updates.isDIY;

  const { data, error } = await supabase
    .from('services')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toServiceEntry(data);
}

export async function deleteService(id: string): Promise<void> {
  // Delete receipts from storage first
  const { data: receipts } = await supabase
    .from('receipts')
    .select('storage_path')
    .eq('service_id', id);

  if (receipts && receipts.length > 0) {
    const paths = receipts.map(r => r.storage_path);
    const { error: storageError } = await supabase.storage.from('receipts').remove(paths);
    if (storageError) {
      console.error('Failed to delete receipt files from storage:', storageError);
      // Continue with service deletion even if storage cleanup fails
    }
  }

  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

// Reminders
export async function getReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toReminder);
}

export async function createReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      vehicle_id: reminder.vehicleId,
      title: reminder.title,
      type: reminder.type,
      due_date: reminder.dueDate || null,
      due_mileage: reminder.dueMileage || null,
      interval_months: reminder.intervalMonths || null,
      interval_miles: reminder.intervalMiles || null,
      is_active: reminder.isActive,
    })
    .select()
    .single();

  if (error) throw error;
  return toReminder(data);
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
  if (updates.dueMileage !== undefined) dbUpdates.due_mileage = updates.dueMileage || null;
  if (updates.intervalMonths !== undefined) dbUpdates.interval_months = updates.intervalMonths || null;
  if (updates.intervalMiles !== undefined) dbUpdates.interval_miles = updates.intervalMiles || null;
  if (updates.lastCompleted !== undefined) dbUpdates.last_completed = updates.lastCompleted || null;
  if (updates.lastCompletedOdometer !== undefined) dbUpdates.last_completed_odometer = updates.lastCompletedOdometer || null;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('reminders')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toReminder(data);
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw error;
}

// Receipt URL
export async function getReceiptUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('receipts')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  return data?.signedUrl || '';
}
