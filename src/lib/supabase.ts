import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbVehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  odometer_unit: 'miles' | 'km';
  current_odometer: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbService {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;
  odometer: number | null;
  category: string;
  service_type: string;
  notes: string | null;
  cost: number | null;
  vendor: string | null;
  is_diy: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbReminder {
  id: string;
  user_id: string;
  vehicle_id: string;
  title: string;
  type: 'time' | 'mileage' | 'both';
  due_date: string | null;
  due_mileage: number | null;
  interval_months: number | null;
  interval_miles: number | null;
  last_completed: string | null;
  last_completed_odometer: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbReceipt {
  id: string;
  user_id: string;
  service_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription_status: 'free' | 'pro' | 'cancelled';
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}
