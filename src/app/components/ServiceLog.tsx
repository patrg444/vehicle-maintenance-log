import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { EmptyState } from '@/app/components/EmptyState';
import { Vehicle, ServiceEntry, Receipt, SERVICE_CATEGORIES } from '@/app/types';
import { Plus, FileText, Upload, X, File, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ServiceLogProps {
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[]) => void;
  services: ServiceEntry[];
  setServices: (services: ServiceEntry[]) => void;
  selectedVehicle: Vehicle | null;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string) => void;
  onAddVehicle?: () => void;
}

export function ServiceLog({
  vehicles,
  setVehicles,
  services,
  setServices,
  selectedVehicle,
  selectedVehicleId,
  setSelectedVehicleId,
  onAddVehicle,
}: ServiceLogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [performedBy, setPerformedBy] = useState<'shop' | 'diy'>('shop');
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    odometer: '',
    category: '',
    serviceType: '',
    notes: '',
    cost: '',
    vendor: '',
    isDIY: false,
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const vehicleServices = services.filter((s) => s.vehicleId === selectedVehicleId);

  // Get last service odometer for validation
  const lastServiceOdometer = vehicleServices.length > 0
    ? Math.max(...vehicleServices.filter(s => s.odometer !== null).map(s => s.odometer!))
    : selectedVehicle?.currentOdometer || 0;

  // Update odometer when vehicle changes
  useEffect(() => {
    if (selectedVehicle && selectedVehicle.currentOdometer !== null) {
      setFormData(prev => ({
        ...prev,
        odometer: Math.max(selectedVehicle.currentOdometer!, lastServiceOdometer).toString(),
      }));
    }
  }, [selectedVehicle, lastServiceOdometer]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newReceipt: Receipt = {
          id: `receipt-${Date.now()}-${Math.random()}`,
          name: file.name,
          dataUrl: event.target?.result as string,
          type: file.type,
        };
        setReceipts([...receipts, newReceipt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReceipt = (id: string) => {
    setReceipts(receipts.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicleId) {
      toast.error('Please select a vehicle first');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    // Validate odometer (warn if it's decreasing, but allow it)
    if (formData.odometer && parseFloat(formData.odometer) < lastServiceOdometer) {
      const confirmed = confirm(
        `The odometer value (${formData.odometer.toLocaleString()}) is lower than the last recorded value (${lastServiceOdometer.toLocaleString()}). This might be a mistake. Continue anyway?`
      );
      if (!confirmed) {
        return;
      }
    }

    const newService: ServiceEntry = {
      id: `service-${Date.now()}`,
      vehicleId: selectedVehicleId,
      date: formData.date,
      odometer: formData.odometer ? parseFloat(formData.odometer) : 0,
      category: formData.category,
      serviceType: formData.serviceType,
      notes: formData.notes,
      cost: parseFloat(formData.cost) || 0,
      vendor: performedBy === 'shop' ? formData.vendor : 'DIY',
      isDIY: performedBy === 'diy',
      receipts,
    };

    setServices([...services, newService]);

    // Update vehicle odometer if this service has a higher value
    if (selectedVehicle && formData.odometer) {
      const newOdometer = parseFloat(formData.odometer);
      const currentOdometer = selectedVehicle.currentOdometer ?? 0;
      
      if (newOdometer > currentOdometer) {
        setVehicles(
          vehicles.map((v) =>
            v.id === selectedVehicleId
              ? { ...v, currentOdometer: newOdometer }
              : v
          )
        );
      }
    }

    toast.success('Service entry added');
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      odometer: selectedVehicle?.currentOdometer ? selectedVehicle.currentOdometer.toString() : '',
      category: '',
      serviceType: '',
      notes: '',
      cost: '',
      vendor: '',
      isDIY: false,
    });
    setPerformedBy('shop');
    setReceipts([]);
  };

  const deleteService = (id: string) => {
    if (confirm('Delete this service entry?')) {
      setServices(services.filter((s) => s.id !== id));
      toast.success('Service entry deleted');
    }
  };

  if (!selectedVehicle) {
    return (
      <EmptyState
        icon={FileText}
        title="No vehicle selected"
        description="Please select a vehicle from the dropdown above to view and manage its service history"
        primaryAction={
          vehicles.length > 0 && selectedVehicleId === null
            ? {
                label: 'Select Vehicle',
                onClick: () => {
                  // User should use the dropdown in header
                },
              }
            : onAddVehicle
            ? {
                label: 'Add Your First Vehicle',
                onClick: onAddVehicle,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Summary Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
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
                {selectedVehicle.currentOdometer !== null 
                  ? selectedVehicle.currentOdometer.toLocaleString()
                  : 'Not set'
                }
              </p>
              <p className="text-sm text-gray-700">{selectedVehicle.odometerUnit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-lg font-semibold text-gray-900">
                {vehicleServices.length}
              </p>
              <p className="text-sm text-gray-700">
                {vehicleServices.filter((s) => s.isDIY).length} DIY
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-lg font-semibold text-gray-900">
                ${vehicleServices.reduce((sum, s) => sum + (s.cost ?? 0), 0).toFixed(2)}
              </p>
              {vehicleServices.length > 0 && (
                <p className="text-sm text-gray-700">
                  Last: {format(new Date(Math.max(...vehicleServices.map(s => new Date(s.date).getTime()))), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Log</h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete maintenance history
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
              Add Service Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>New Service Entry</DialogTitle>
                <DialogDescription>
                  Record a maintenance or repair service
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odometer">
                      Odometer ({selectedVehicle.odometerUnit}) *
                    </Label>
                    <Input
                      id="odometer"
                      type="number"
                      value={formData.odometer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          odometer: e.target.value,
                        })
                      }
                      required
                    />
                    {lastServiceOdometer > 0 && (
                      <p className="text-xs text-gray-500">
                        Last recorded: {lastServiceOdometer.toLocaleString()} {selectedVehicle.odometerUnit}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                      required
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Input
                      id="serviceType"
                      value={formData.serviceType}
                      onChange={(e) =>
                        setFormData({ ...formData, serviceType: e.target.value })
                      }
                      placeholder="e.g., Full synthetic oil change"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Performed by</Label>
                  <RadioGroup
                    value={performedBy}
                    onValueChange={(value: 'shop' | 'diy') => setPerformedBy(value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="shop" id="performed-shop" />
                      <Label htmlFor="performed-shop" className="cursor-pointer">
                        Shop/Mechanic
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="diy" id="performed-diy" />
                      <Label htmlFor="performed-diy" className="cursor-pointer">
                        DIY (I did it)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost: e.target.value,
                        })
                      }
                      placeholder="e.g., 89.99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">
                      {performedBy === 'shop' ? 'Shop name' : 'Parts vendor (optional)'}
                    </Label>
                    <Input
                      id="vendor"
                      value={formData.vendor}
                      onChange={(e) =>
                        setFormData({ ...formData, vendor: e.target.value })
                      }
                      placeholder={
                        performedBy === 'shop' 
                          ? 'e.g., Jiffy Lube, Toyota Dealer'
                          : 'e.g., AutoZone, RockAuto, Amazon'
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional details, parts used, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Receipts/Photos</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Images or PDFs, up to 5MB each
                      </span>
                    </label>
                  </div>
                  {receipts.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {receipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="flex items-center gap-2 p-2 border rounded bg-gray-50"
                        >
                          <File className="w-4 h-4 text-gray-600" />
                          <span className="text-sm flex-1 truncate">
                            {receipt.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReceipt(receipt.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                >
                  Cancel
                </Button>
                <Button type="submit">Add Service Entry</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehicleServices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No service history yet"
          description="Add your first service entry to start tracking"
          helperText="💡 Tip: Start with your last oil change. Attach the receipt and note the odometer reading."
          primaryAction={{
            label: 'Add Service Entry',
            onClick: () => setIsDialogOpen(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {vehicleServices
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{service.serviceType}</CardTitle>
                      <CardDescription>{service.category}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteService(service.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Date</p>
                        <p className="font-medium">
                          {format(new Date(service.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">Odometer</p>
                      <p className="font-medium">
                        {service.odometer !== null 
                          ? `${service.odometer.toLocaleString()} ${selectedVehicle.odometerUnit}`
                          : 'Unknown'
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Cost</p>
                        <p className="font-medium">${service.cost !== null ? service.cost.toFixed(2) : '0.00'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">Vendor</p>
                      <p className="font-medium">
                        {service.isDIY ? 'DIY' : service.vendor || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {service.notes && (
                    <p className="text-sm text-gray-700 mt-4 p-3 bg-gray-50 rounded">
                      {service.notes}
                    </p>
                  )}
                  {service.receipts.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Attachments ({service.receipts.length})
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {service.receipts.map((receipt) => (
                          <a
                            key={receipt.id}
                            href={receipt.dataUrl}
                            download={receipt.name}
                            className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50 text-sm"
                          >
                            <File className="w-4 h-4" />
                            {receipt.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}