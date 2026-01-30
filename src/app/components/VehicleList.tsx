import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Vehicle } from '@/app/types';
import { Plus, Car, Gauge, MoreVertical, Archive, Trash2, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as db from '@/lib/database';

interface VehicleListProps {
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
}

export function VehicleList({
  vehicles,
  setVehicles,
  selectedVehicleId,
  setSelectedVehicleId,
}: VehicleListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOdometerDialogOpen, setIsOdometerDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [updatingOdometerVehicle, setUpdatingOdometerVehicle] = useState<Vehicle | null>(null);
  const [odometerValue, setOdometerValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    odometerUnit: 'miles' as 'miles' | 'km',
    currentOdometer: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.make || !formData.model) {
      toast.error('Please fill in make and model');
      return;
    }

    const parsedOdometer = formData.currentOdometer === '' ? null : parseInt(formData.currentOdometer);
    const safeOdometer = parsedOdometer !== null && !isNaN(parsedOdometer) ? parsedOdometer : null;

    setSaving(true);
    try {
      if (editingVehicle) {
        // Update existing vehicle
        const updated = await db.updateVehicle(editingVehicle.id, {
          make: formData.make,
          model: formData.model,
          year: formData.year,
          vin: formData.vin || undefined,
          odometerUnit: formData.odometerUnit,
          currentOdometer: safeOdometer,
        });
        setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? updated : v));
        toast.success('Vehicle updated successfully');
      } else {
        // Add new vehicle
        const newVehicle = await db.createVehicle({
          make: formData.make,
          model: formData.model,
          year: formData.year,
          vin: formData.vin || undefined,
          odometerUnit: formData.odometerUnit,
          currentOdometer: safeOdometer,
        });
        setVehicles(prev => [...prev, newVehicle]);
        setSelectedVehicleId(newVehicle.id);
        toast.success('Vehicle added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save vehicle');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      odometerUnit: 'miles',
      currentOdometer: '',
    });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin || '',
      odometerUnit: vehicle.odometerUnit,
      currentOdometer: vehicle.currentOdometer !== null ? vehicle.currentOdometer.toString() : '',
    });
    setIsDialogOpen(true);
  };

  const handleArchive = async (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    try {
      const updated = await db.updateVehicle(vehicleId, { isArchived: !vehicle.isArchived });
      setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));

      if (selectedVehicleId === vehicleId && !vehicle.isArchived) {
        const activeVehicles = vehicles.filter(v => v.id !== vehicleId && !v.isArchived);
        if (activeVehicles.length > 0) {
          setSelectedVehicleId(activeVehicles[0].id);
        } else {
          setSelectedVehicleId(null);
        }
      }

      toast.success(vehicle.isArchived ? 'Vehicle restored' : 'Vehicle archived');
    } catch (error) {
      toast.error('Failed to archive vehicle');
      console.error(error);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this vehicle? This will also delete all associated service records and reminders. This action cannot be undone.'
    );

    if (confirmed) {
      try {
        await db.deleteVehicle(vehicleId);
        setVehicles(prev => prev.filter(v => v.id !== vehicleId));
        if (selectedVehicleId === vehicleId) {
          const remaining = vehicles.filter(v => v.id !== vehicleId);
          setSelectedVehicleId(remaining.length > 0 ? remaining[0].id : null);
        }
        toast.success('Vehicle deleted');
      } catch (error) {
        toast.error('Failed to delete vehicle');
        console.error(error);
      }
    }
  };

  const handleUpdateOdometer = (vehicle: Vehicle) => {
    setUpdatingOdometerVehicle(vehicle);
    setOdometerValue(vehicle.currentOdometer !== null ? vehicle.currentOdometer.toString() : '');
    setIsOdometerDialogOpen(true);
  };

  const submitOdometerUpdate = async () => {
    if (!updatingOdometerVehicle) return;

    // Validate and parse odometer value
    if (odometerValue !== '' && isNaN(Number(odometerValue))) {
      toast.error('Please enter a valid number');
      return;
    }

    const parsedOdometer = odometerValue === '' ? null : parseInt(odometerValue);
    const safeOdometer = parsedOdometer !== null && !isNaN(parsedOdometer) ? parsedOdometer : null;

    setSaving(true);
    try {
      const updated = await db.updateVehicle(updatingOdometerVehicle.id, { currentOdometer: safeOdometer });
      setVehicles(prev => prev.map(v => v.id === updatingOdometerVehicle.id ? updated : v));
      toast.success('Odometer updated successfully');
      setIsOdometerDialogOpen(false);
      setUpdatingOdometerVehicle(null);
      setOdometerValue('');
    } catch (error) {
      toast.error('Failed to update odometer');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Filter out archived vehicles for display
  const activeVehicles = vehicles.filter(v => !v.isArchived);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Vehicles</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your vehicle information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </DialogTitle>
                <DialogDescription>
                  Enter your vehicle details below
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) =>
                        setFormData({ ...formData, make: e.target.value })
                      }
                      placeholder="Toyota"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="Camry"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value);
                        setFormData({ ...formData, year: isNaN(parsed) ? new Date().getFullYear() : parsed });
                      }}
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odometerUnit">Odometer Unit</Label>
                    <Select
                      value={formData.odometerUnit}
                      onValueChange={(value: 'miles' | 'km') =>
                        setFormData({ ...formData, odometerUnit: value })
                      }
                      disabled={saving}
                    >
                      <SelectTrigger id="odometerUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="miles">Miles</SelectItem>
                        <SelectItem value="km">Kilometers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentOdometer">Current Odometer</Label>
                  <Input
                    id="currentOdometer"
                    type="number"
                    value={formData.currentOdometer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentOdometer: e.target.value,
                      })
                    }
                    placeholder="Enter current mileage"
                    min={0}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500">Leave blank if unknown</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN (optional)</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) =>
                      setFormData({ ...formData, vin: e.target.value })
                    }
                    placeholder="1HGBH41JXMN109186"
                    disabled={saving}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editingVehicle ? 'Update' : 'Add'} Vehicle</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Odometer Update Dialog */}
      <Dialog open={isOdometerDialogOpen} onOpenChange={setIsOdometerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Odometer</DialogTitle>
            <DialogDescription>
              {updatingOdometerVehicle && (
                <>
                  {updatingOdometerVehicle.year} {updatingOdometerVehicle.make} {updatingOdometerVehicle.model}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="odometer-update">
                Odometer ({updatingOdometerVehicle?.odometerUnit})
              </Label>
              <Input
                id="odometer-update"
                type="number"
                value={odometerValue}
                onChange={(e) => setOdometerValue(e.target.value)}
                placeholder="Enter current mileage"
                min={0}
                disabled={saving}
              />
              {updatingOdometerVehicle?.currentOdometer !== null && (
                <p className="text-xs text-gray-500">
                  Current: {updatingOdometerVehicle?.currentOdometer?.toLocaleString()} {updatingOdometerVehicle?.odometerUnit}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOdometerDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={submitOdometerUpdate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeVehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No vehicles yet
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add your first vehicle to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeVehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className={`cursor-pointer transition-all ${
                selectedVehicleId === vehicle.id
                  ? 'ring-2 ring-blue-600 shadow-lg'
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedVehicleId(vehicle.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Car className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {vehicle.year} {vehicle.make}
                      </CardTitle>
                      <CardDescription>{vehicle.model}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(vehicle);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Vehicle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(vehicle.id);
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(vehicle.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Odometer:</span>
                    <span className="font-medium">
                      {vehicle.currentOdometer !== null
                        ? `${vehicle.currentOdometer.toLocaleString()} ${vehicle.odometerUnit}`
                        : 'Not set'
                      }
                    </span>
                  </div>
                  {vehicle.vin && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">VIN:</span>
                      <span className="font-mono text-xs">
                        {vehicle.vin.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateOdometer(vehicle);
                    }}
                    className="w-full"
                  >
                    <Gauge className="w-4 h-4 mr-2" />
                    Update Odometer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
