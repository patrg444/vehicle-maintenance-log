import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { VehicleList } from '@/app/components/VehicleList';
import { ServiceLog } from '@/app/components/ServiceLog';
import { Reminders } from '@/app/components/Reminders';
import { ExportData } from '@/app/components/ExportData';
import { VehicleSelector } from '@/app/components/VehicleSelector';
import { Vehicle, ServiceEntry, Reminder } from '@/app/types';
import {
  loadVehicles,
  saveVehicles,
  loadServices,
  saveServices,
  loadReminders,
  saveReminders,
} from '@/app/utils/storage';
import { Car, FileText, Bell, Download } from 'lucide-react';
import { Toaster } from '@/app/components/ui/sonner';

function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('vehicles');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedVehicles = loadVehicles();
    const loadedServices = loadServices();
    const loadedReminders = loadReminders();

    setVehicles(loadedVehicles);
    setServices(loadedServices);
    setReminders(loadedReminders);

    // Auto-select vehicle: try last used, then first available
    const lastUsedVehicleId = localStorage.getItem('lastSelectedVehicleId');
    if (lastUsedVehicleId && loadedVehicles.some(v => v.id === lastUsedVehicleId)) {
      setSelectedVehicleId(lastUsedVehicleId);
    } else if (loadedVehicles.length > 0) {
      setSelectedVehicleId(loadedVehicles[0].id);
    }
  }, []);

  // Auto-save data to localStorage
  useEffect(() => {
    saveVehicles(vehicles);
  }, [vehicles]);

  useEffect(() => {
    saveServices(services);
  }, [services]);

  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Save last selected vehicle
  useEffect(() => {
    if (selectedVehicleId) {
      localStorage.setItem('lastSelectedVehicleId', selectedVehicleId);
    }
  }, [selectedVehicleId]);

  // Auto-select if only one vehicle exists and none selected
  useEffect(() => {
    if (vehicles.length === 1 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  const handleAddVehicle = () => {
    setActiveTab('vehicles');
  };

  const handleAddService = () => {
    setActiveTab('services');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Car Service Binder</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Local-first vehicle maintenance tracking
                </p>
              </div>
            </div>
            <VehicleSelector
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onVehicleChange={setSelectedVehicleId}
              onAddVehicle={handleAddVehicle}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Service Log
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <VehicleList
              vehicles={vehicles}
              setVehicles={setVehicles}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
            />
          </TabsContent>

          <TabsContent value="services">
            <ServiceLog
              vehicles={vehicles}
              setVehicles={setVehicles}
              services={services}
              setServices={setServices}
              selectedVehicle={selectedVehicle}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
              onAddVehicle={handleAddVehicle}
            />
          </TabsContent>

          <TabsContent value="reminders">
            <Reminders
              vehicles={vehicles}
              reminders={reminders}
              setReminders={setReminders}
              services={services}
              selectedVehicle={selectedVehicle}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
              onAddVehicle={handleAddVehicle}
            />
          </TabsContent>

          <TabsContent value="export">
            <ExportData
              vehicles={vehicles}
              services={services}
              reminders={reminders}
              selectedVehicle={selectedVehicle}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
              onAddVehicle={handleAddVehicle}
              onAddService={handleAddService}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;