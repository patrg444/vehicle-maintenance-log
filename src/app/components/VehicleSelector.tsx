import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Vehicle } from '@/app/types';
import { Car, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onVehicleChange: (vehicleId: string) => void;
  onAddVehicle?: () => void;
}

export function VehicleSelector({
  vehicles,
  selectedVehicleId,
  onVehicleChange,
  onAddVehicle,
}: VehicleSelectorProps) {
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  if (vehicles.length === 0) {
    return onAddVehicle ? (
      <Button onClick={onAddVehicle} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        Add Your First Vehicle
      </Button>
    ) : null;
  }

  return (
    <Select value={selectedVehicleId || undefined} onValueChange={onVehicleChange}>
      <SelectTrigger className="w-[280px] bg-white">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-gray-500" />
          <SelectValue>
            {selectedVehicle ? (
              <span>
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                <span className="text-gray-500 text-xs ml-2">
                  ({selectedVehicle.currentOdometer?.toLocaleString() ?? '—'}{' '}
                  {selectedVehicle.odometerUnit})
                </span>
              </span>
            ) : (
              'Select a vehicle'
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {vehicles.map((vehicle) => (
          <SelectItem key={vehicle.id} value={vehicle.id}>
            <div className="flex flex-col">
              <span className="font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
              <span className="text-xs text-gray-500">
                {vehicle.currentOdometer?.toLocaleString() ?? '—'} {vehicle.odometerUnit}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}