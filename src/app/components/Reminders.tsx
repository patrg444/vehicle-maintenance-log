import { useState } from 'react';
import { Plus, Bell, Calendar, Gauge, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { EmptyState } from '@/app/components/EmptyState';

// Helper to parse date string as local date (not UTC)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface RemindersProps {
  vehicles: Vehicle[];
  reminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
  services: ServiceEntry[];
  selectedVehicle: Vehicle | null;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string) => void;
  onAddVehicle?: () => void;
}

export function Reminders({
  vehicles,
  reminders,
  setReminders,
  services,
  selectedVehicle,
  selectedVehicleId,
  setSelectedVehicleId,
  onAddVehicle,
}: RemindersProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'both' as 'time' | 'mileage' | 'both',
    dueDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    dueMileage: 5000,
    intervalMonths: 6,
    intervalMiles: 5000,
  });

  const vehicleReminders = reminders.filter((r) => r.vehicleId === selectedVehicleId);

  // Compute next due display
  const computedNextDue = () => {
    if (!selectedVehicle) return '';
    
    const parts = [];
    if (formData.type !== 'mileage') {
      parts.push(format(parseLocalDate(formData.dueDate), 'MMM d, yyyy'));
    }
    if (formData.type !== 'time') {
      const dueMileage = (selectedVehicle.currentOdometer || 0) + formData.dueMileage;
      parts.push(`${dueMileage.toLocaleString()} ${selectedVehicle.odometerUnit}`);
    }
    
    return parts.length === 2 
      ? `${parts[0]} or ${parts[1]} (whichever comes first)`
      : parts[0];
  };

  const isDue = (reminder: Reminder): boolean => {
    if (!selectedVehicle) return false;

    const now = new Date();
    const currentOdometer = selectedVehicle.currentOdometer;

    if (reminder.type === 'time' && reminder.dueDate) {
      return parseLocalDate(reminder.dueDate) <= now;
    }

    if (reminder.type === 'mileage' && reminder.dueMileage) {
      return currentOdometer >= reminder.dueMileage;
    }

    if (reminder.type === 'both') {
      const timeDue = reminder.dueDate ? parseLocalDate(reminder.dueDate) <= now : false;
      const mileageDue = reminder.dueMileage
        ? currentOdometer >= reminder.dueMileage
        : false;
      return timeDue || mileageDue;
    }

    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicleId) {
      toast.error('Please select a vehicle first');
      return;
    }

    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      vehicleId: selectedVehicleId,
      title: formData.title,
      type: formData.type,
      dueDate: formData.type !== 'mileage' ? formData.dueDate : undefined,
      dueMileage:
        formData.type !== 'time'
          ? (selectedVehicle?.currentOdometer || 0) + formData.dueMileage
          : undefined,
      intervalMonths: formData.type !== 'mileage' ? formData.intervalMonths : undefined,
      intervalMiles: formData.type !== 'time' ? formData.intervalMiles : undefined,
      isActive: true,
    };

    setReminders([...reminders, newReminder]);
    toast.success('Reminder added');
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'both',
      dueDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      dueMileage: 5000,
      intervalMonths: 6,
      intervalMiles: 5000,
    });
  };

  const deleteReminder = (id: string) => {
    if (confirm('Delete this reminder?')) {
      setReminders(reminders.filter((r) => r.id !== id));
      toast.success('Reminder deleted');
    }
  };

  const completeReminder = (reminder: Reminder) => {
    if (!selectedVehicle) return;

    // Calculate next due dates
    let nextDueDate: string | undefined;
    let nextDueMileage: number | undefined;

    if (reminder.type !== 'mileage' && reminder.intervalMonths) {
      nextDueDate = format(
        addMonths(new Date(), reminder.intervalMonths),
        'yyyy-MM-dd'
      );
    }

    if (reminder.type !== 'time' && reminder.intervalMiles) {
      nextDueMileage = selectedVehicle.currentOdometer + reminder.intervalMiles;
    }

    setReminders(
      reminders.map((r) =>
        r.id === reminder.id
          ? {
              ...r,
              dueDate: nextDueDate,
              dueMileage: nextDueMileage,
              lastCompleted: format(new Date(), 'yyyy-MM-dd'),
              lastCompletedOdometer: selectedVehicle.currentOdometer,
            }
          : r
      )
    );

    toast.success('Reminder completed and rescheduled');
  };

  if (!selectedVehicle) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No vehicle selected
          </h3>
          <p className="text-sm text-gray-600">
            Please select a vehicle to manage reminders
          </p>
          {onAddVehicle && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={onAddVehicle}
            >
              Add Vehicle
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const dueReminders = vehicleReminders.filter((r) => r.isActive && isDue(r));
  const upcomingReminders = vehicleReminders.filter((r) => r.isActive && !isDue(r));

  return (
    <div className="space-y-6">
      {/* Vehicle Summary Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vehicle</p>
              <p className="text-lg font-semibold text-gray-900">
                {selectedVehicle.year} {selectedVehicle.make}
              </p>
              <p className="text-sm text-gray-700">{selectedVehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Odometer</p>
              <p className="text-lg font-semibold text-gray-900">
                {selectedVehicle.currentOdometer.toLocaleString()}
              </p>
              <p className="text-sm text-gray-700">{selectedVehicle.odometerUnit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Now</p>
              <p className={`text-lg font-semibold ${dueReminders.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {dueReminders.length}
              </p>
              <p className="text-sm text-gray-700">
                {upcomingReminders.length} upcoming
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reminders</p>
              <p className="text-lg font-semibold text-gray-900">
                {vehicleReminders.length}
              </p>
              <p className="text-sm text-gray-700">
                {vehicleReminders.filter(r => r.isActive).length} active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reminders</h2>
          <p className="text-sm text-gray-600 mt-1">
            Stay on top of maintenance
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>New Reminder</DialogTitle>
                <DialogDescription>
                  Set up a maintenance reminder
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Oil Change, Tire Rotation"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Reminder Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'time' | 'mileage' | 'both') =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Time-based only</SelectItem>
                      <SelectItem value="mileage">Mileage-based only</SelectItem>
                      <SelectItem value="both">Both (whichever comes first)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type !== 'mileage' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intervalMonths">Repeat every (months)</Label>
                      <Input
                        id="intervalMonths"
                        type="number"
                        value={formData.intervalMonths}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intervalMonths: parseInt(e.target.value) || 0,
                          })
                        }
                        min={1}
                      />
                    </div>
                  </>
                )}
                {formData.type !== 'time' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dueMileage">
                        Due in (additional {selectedVehicle.odometerUnit})
                      </Label>
                      <Input
                        id="dueMileage"
                        type="number"
                        value={formData.dueMileage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dueMileage: parseInt(e.target.value) || 0,
                          })
                        }
                        min={1}
                      />
                      <p className="text-xs text-gray-500">
                        Will be due at:{' '}
                        {(
                          (selectedVehicle?.currentOdometer || 0) + formData.dueMileage
                        ).toLocaleString()}{' '}
                        {selectedVehicle.odometerUnit}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intervalMiles">
                        Repeat every ({selectedVehicle.odometerUnit})
                      </Label>
                      <Input
                        id="intervalMiles"
                        type="number"
                        value={formData.intervalMiles}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intervalMiles: parseInt(e.target.value) || 0,
                          })
                        }
                        min={1}
                      />
                    </div>
                  </>
                )}
              </div>
              {selectedVehicle && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Next Due:
                  </p>
                  <p className="text-sm text-blue-800">
                    {computedNextDue()}
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Reminder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {dueReminders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Due Now</h3>
            <Badge variant="destructive">{dueReminders.length}</Badge>
          </div>
          <div className="space-y-3">
            {dueReminders.map((reminder) => (
              <Card key={reminder.id} className="border-red-200 bg-red-50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-red-900">
                        {reminder.title}
                      </CardTitle>
                      <CardDescription className="text-red-700">
                        {reminder.type === 'both' && 'Time or Mileage'}
                        {reminder.type === 'time' && 'Time-based'}
                        {reminder.type === 'mileage' && 'Mileage-based'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    {reminder.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-red-600" />
                        <div>
                          <p className="text-gray-600">Due Date</p>
                          <p className="font-medium text-red-900">
                            {format(new Date(reminder.dueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    )}
                    {reminder.dueMileage && (
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-red-600" />
                        <div>
                          <p className="text-gray-600">Due Mileage</p>
                          <p className="font-medium text-red-900">
                            {reminder.dueMileage.toLocaleString()} {selectedVehicle.odometerUnit}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => completeReminder(reminder)}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcomingReminders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming</h3>
          <div className="space-y-3">
            {upcomingReminders.map((reminder) => (
              <Card key={reminder.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{reminder.title}</CardTitle>
                      <CardDescription>
                        {reminder.type === 'both' && 'Time or Mileage'}
                        {reminder.type === 'time' && 'Time-based'}
                        {reminder.type === 'mileage' && 'Mileage-based'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {reminder.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Due Date</p>
                          <p className="font-medium">
                            {format(new Date(reminder.dueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    )}
                    {reminder.dueMileage && (
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Due Mileage</p>
                          <p className="font-medium">
                            {reminder.dueMileage.toLocaleString()} {selectedVehicle.odometerUnit}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {vehicleReminders.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No reminders set"
          description="Add a reminder to stay on top of maintenance"
          helperText="💡 Choose months, miles, or both. We'll track whichever comes first."
          primaryAction={{
            label: 'Add Reminder',
            onClick: () => setIsDialogOpen(true),
          }}
        />
      )}
    </div>
  );
}