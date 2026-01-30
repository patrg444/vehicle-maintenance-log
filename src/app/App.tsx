import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { VehicleList } from '@/app/components/VehicleList';
import { ServiceLog } from '@/app/components/ServiceLog';
import { Reminders } from '@/app/components/Reminders';
import { ExportData } from '@/app/components/ExportData';
import { VehicleSelector } from '@/app/components/VehicleSelector';
import { Auth } from '@/app/components/Auth';
import { Pricing } from '@/app/components/Pricing';
import { useAuth } from '@/lib/AuthContext';
import { useData } from '@/lib/useData';
import { Car, FileText, Bell, Download, LogOut, Loader2, Crown } from 'lucide-react';
import { Toaster } from '@/app/components/ui/sonner';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';

function App() {
  const { user, profile, loading: authLoading, signOut, isPro } = useAuth();
  const {
    vehicles,
    services,
    reminders,
    loading: dataLoading,
    setVehicles,
    setServices,
    setReminders,
    refetch,
  } = useData();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('vehicles');

  // Auto-select vehicle when data loads
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      const lastUsedVehicleId = localStorage.getItem('lastSelectedVehicleId');
      if (lastUsedVehicleId && vehicles.some(v => v.id === lastUsedVehicleId)) {
        setSelectedVehicleId(lastUsedVehicleId);
      } else {
        setSelectedVehicleId(vehicles[0].id);
      }
    }
  }, [vehicles, selectedVehicleId]);

  // Save last selected vehicle
  useEffect(() => {
    if (selectedVehicleId) {
      localStorage.setItem('lastSelectedVehicleId', selectedVehicleId);
    }
  }, [selectedVehicleId]);

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth if not logged in
  if (!user) {
    return <Auth />;
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  const handleAddVehicle = () => {
    setActiveTab('vehicles');
  };

  const handleAddService = () => {
    setActiveTab('services');
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Vehicle Maintenance Log</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Track your vehicle maintenance and service history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <VehicleSelector
                vehicles={vehicles.filter(v => !v.isArchived)}
                selectedVehicleId={selectedVehicleId}
                onVehicleChange={setSelectedVehicleId}
                onAddVehicle={handleAddVehicle}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {profile?.full_name && (
                        <p className="font-medium">{profile.full_name}</p>
                      )}
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {isPro ? (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                            <Crown className="w-3 h-3 mr-1" />
                            Pro
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {!isPro && (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer text-orange-600"
                        onClick={() => setActiveTab('upgrade')}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Pro
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
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
                onImportComplete={refetch}
              />
            </TabsContent>

            <TabsContent value="upgrade">
              <Pricing />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default App;
