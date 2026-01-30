import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { EmptyState } from '@/app/components/EmptyState';
import { Vehicle, ServiceEntry, Reminder } from '@/app/types';
import { Download, FileText, FileSpreadsheet, Package, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import * as db from '@/lib/database';

interface ExportDataProps {
  vehicles: Vehicle[];
  services: ServiceEntry[];
  reminders: Reminder[];
  selectedVehicle: Vehicle | null;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string) => void;
  onAddVehicle?: () => void;
  onAddService?: () => void;
  onImportComplete?: () => void;
}

interface ImportData {
  vehicles?: Array<Omit<Vehicle, 'id'> & { id?: string }>;
  services?: Array<Omit<ServiceEntry, 'id' | 'receipts'> & { id?: string; vehicleId: string }>;
  reminders?: Array<Omit<Reminder, 'id'> & { id?: string; vehicleId: string }>;
  exportDate?: string;
}

export function ExportData({
  vehicles,
  services,
  reminders,
  selectedVehicle,
  selectedVehicleId,
  onAddVehicle,
  onAddService,
  onImportComplete,
}: ExportDataProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const vehicleServices = services.filter((s) => s.vehicleId === selectedVehicleId);

  const exportToCSV = () => {
    if (!selectedVehicle || vehicleServices.length === 0) {
      toast.error('No service history to export');
      return;
    }

    const headers = [
      'Date',
      'Odometer',
      'Category',
      'Service Type',
      'Cost',
      'Vendor',
      'DIY',
      'Notes',
      'Receipts',
    ];

    const rows = vehicleServices.map((service) => [
      service.date,
      service.odometer !== null ? service.odometer.toString() : 'Unknown',
      service.category,
      service.serviceType,
      service.cost !== null ? service.cost.toFixed(2) : '0.00',
      service.vendor || '',
      service.isDIY ? 'Yes' : 'No',
      service.notes.replace(/\"/g, '\"\"'), // Escape quotes
      service.receipts.length.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${selectedVehicle.year}-${selectedVehicle.make}-${selectedVehicle.model}-service-history.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV exported successfully');
  };

  const exportToPDF = async () => {
    if (!selectedVehicle || vehicleServices.length === 0) {
      toast.error('No service history to export');
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.text('Service History Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Vehicle Info
      doc.setFontSize(12);
      doc.text(
        `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
      );
      yPos += 7;

      if (selectedVehicle.vin) {
        doc.setFontSize(10);
        doc.text(`VIN: ${selectedVehicle.vin}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;
      }

      doc.text(
        `Current Odometer: ${selectedVehicle.currentOdometer !== null ? selectedVehicle.currentOdometer.toLocaleString() : 'Not set'} ${selectedVehicle.odometerUnit}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
      );
      yPos += 10;

      doc.setFontSize(10);
      doc.text(
        `Generated: ${format(new Date(), 'MMMM d, yyyy')}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
      );
      yPos += 15;

      // Summary
      doc.setFontSize(14);
      doc.text('Summary', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      const totalCost = vehicleServices.reduce((sum, s) => sum + (s.cost ?? 0), 0);
      doc.text(`Total Service Entries: ${vehicleServices.length}`, 20, yPos);
      yPos += 6;
      doc.text(`Total Cost: $${totalCost.toFixed(2)}`, 20, yPos);
      yPos += 6;
      doc.text(
        `DIY Services: ${vehicleServices.filter((s) => s.isDIY).length}`,
        20,
        yPos
      );
      yPos += 12;

      // Service History
      doc.setFontSize(14);
      doc.text('Service History', 20, yPos);
      yPos += 10;

      doc.setFontSize(9);

      const sortedServices = [...vehicleServices].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      for (const service of sortedServices) {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        // Date and Odometer
        doc.setFont('helvetica', 'bold');
        const odometerText = service.odometer !== null 
          ? `${service.odometer.toLocaleString()} ${selectedVehicle.odometerUnit}`
          : 'Unknown';
        doc.text(
          `${format(new Date(service.date), 'MMM d, yyyy')} - ${odometerText}`,
          20,
          yPos
        );
        yPos += 5;

        // Service Type and Category
        doc.setFont('helvetica', 'normal');
        doc.text(`${service.serviceType} (${service.category})`, 20, yPos);
        yPos += 5;

        // Cost and Vendor
        const costText = service.cost !== null ? service.cost.toFixed(2) : '0.00';
        const costVendor = `Cost: $${costText} | ${service.isDIY ? 'DIY' : service.vendor || 'N/A'}`;
        doc.text(costVendor, 20, yPos);
        yPos += 5;

        // Notes if present
        if (service.notes) {
          const maxWidth = pageWidth - 40;
          const notes = doc.splitTextToSize(`Notes: ${service.notes}`, maxWidth);
          doc.text(notes, 20, yPos);
          yPos += notes.length * 5;
        }

        // Receipts count
        if (service.receipts.length > 0) {
          doc.text(`Receipts: ${service.receipts.length} attached`, 20, yPos);
          yPos += 5;
        }

        yPos += 5; // Space between entries
      }

      // Save PDF
      doc.save(
        `${selectedVehicle.year}-${selectedVehicle.make}-${selectedVehicle.model}-service-history.pdf`
      );

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllData = () => {
    const data = {
      vehicles,
      services,
      reminders,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `car-service-binder-backup-${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Full backup exported');
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const data: ImportData = JSON.parse(text);

      // Validate basic structure
      if (!data.vehicles && !data.services && !data.reminders) {
        throw new Error('Invalid backup file: no data found');
      }

      let vehiclesImported = 0;
      let servicesImported = 0;
      let remindersImported = 0;

      // Map old vehicle IDs to new ones for linking services and reminders
      const vehicleIdMap: Record<string, string> = {};

      // Import vehicles first
      if (data.vehicles && Array.isArray(data.vehicles)) {
        for (const vehicle of data.vehicles) {
          const oldId = vehicle.id;
          const { id: _, ...vehicleData } = vehicle;
          const newVehicle = await db.createVehicle({
            make: vehicleData.make || 'Unknown',
            model: vehicleData.model || 'Unknown',
            year: vehicleData.year || new Date().getFullYear(),
            vin: vehicleData.vin,
            odometerUnit: vehicleData.odometerUnit || 'miles',
            currentOdometer: vehicleData.currentOdometer ?? null,
            isArchived: vehicleData.isArchived || false,
          });
          if (oldId) {
            vehicleIdMap[oldId] = newVehicle.id;
          }
          vehiclesImported++;
        }
      }

      // Import services (link to new vehicle IDs)
      if (data.services && Array.isArray(data.services)) {
        for (const service of data.services) {
          const newVehicleId = vehicleIdMap[service.vehicleId];
          if (!newVehicleId) continue; // Skip if vehicle wasn't imported

          await db.createService({
            vehicleId: newVehicleId,
            date: service.date || new Date().toISOString().split('T')[0],
            odometer: service.odometer ?? null,
            category: service.category || 'Other',
            serviceType: service.serviceType || 'General Service',
            notes: service.notes || '',
            cost: service.cost ?? null,
            vendor: service.vendor || '',
            isDIY: service.isDIY || false,
          });
          servicesImported++;
        }
      }

      // Import reminders (link to new vehicle IDs)
      if (data.reminders && Array.isArray(data.reminders)) {
        for (const reminder of data.reminders) {
          const newVehicleId = vehicleIdMap[reminder.vehicleId];
          if (!newVehicleId) continue; // Skip if vehicle wasn't imported

          await db.createReminder({
            vehicleId: newVehicleId,
            title: reminder.title || 'Imported Reminder',
            type: reminder.type || 'time',
            dueDate: reminder.dueDate,
            dueMileage: reminder.dueMileage,
            intervalMonths: reminder.intervalMonths,
            intervalMiles: reminder.intervalMiles,
            lastCompleted: reminder.lastCompleted,
            lastCompletedOdometer: reminder.lastCompletedOdometer,
            isActive: reminder.isActive ?? true,
          });
          remindersImported++;
        }
      }

      toast.success(
        `Import complete: ${vehiclesImported} vehicles, ${servicesImported} services, ${remindersImported} reminders`
      );

      // Refresh data in parent
      onImportComplete?.();

      // Reset file input
      event.target.value = '';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid file format';
      toast.error(`Failed to import: ${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (!selectedVehicle) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Download className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No vehicle selected
          </h3>
          <p className="text-sm text-gray-600">
            Please select a vehicle to export data
          </p>
          {onAddVehicle && (
            <Button
              onClick={onAddVehicle}
              variant="outline"
              className="mt-4"
            >
              Add Vehicle
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Export Data</h2>
        <p className="text-sm text-gray-600 mt-1">
          {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
        </p>
      </div>

      {/* For This Vehicle Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">For This Vehicle</h3>
          <p className="text-sm text-gray-600 mt-1">
            Export service history and documents for this vehicle
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Resale Packet (PDF)</CardTitle>
                  <CardDescription>
                    Buyer-ready service history
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Professional service history report with maintenance records, costs, and summary totals. Perfect for proving maintenance history to potential buyers.
              </p>
              {vehicleServices.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-700 space-y-1">
                  <p className="font-semibold">This PDF will include:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{vehicleServices.length} service {vehicleServices.length === 1 ? 'entry' : 'entries'}</li>
                    <li>Total maintenance cost: ${vehicleServices.reduce((sum, s) => sum + (s.cost ?? 0), 0).toFixed(2)}</li>
                    <li>Service dates and odometer readings</li>
                    <li>DIY vs professional service breakdown</li>
                  </ul>
                </div>
              )}
              <Button
                onClick={exportToPDF}
                disabled={isExporting || vehicleServices.length === 0}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Generating...' : 'Export PDF'}
              </Button>
              {vehicleServices.length === 0 && onAddService && (
                <Button
                  onClick={onAddService}
                  variant="outline"
                  className="w-full mt-2"
                >
                  Add Your First Service Entry
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Spreadsheet Export (CSV)</CardTitle>
                  <CardDescription>
                    For analysis and record keeping
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Export service data as CSV for importing into Excel, Google Sheets, or other spreadsheet applications to analyze costs and trends.
              </p>
              <Button
                onClick={exportToCSV}
                variant="outline"
                disabled={vehicleServices.length === 0}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              {vehicleServices.length === 0 && onAddService && (
                <Button
                  onClick={onAddService}
                  variant="outline"
                  className="w-full mt-2"
                >
                  Add Your First Service Entry
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Backup & Transfer Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Backup & Transfer</h3>
          <p className="text-sm text-gray-600 mt-1">
            Save all your data or move it to another device
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Backup All Data</CardTitle>
                  <CardDescription>Complete data archive (JSON)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Creates a complete backup of all vehicles, services, and reminders. Use this for regular backups or to transfer data to another device.
              </p>
              <Button onClick={exportAllData} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export All Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Upload className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Restore from Backup</CardTitle>
                  <CardDescription>Import previously saved data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Import a previously exported backup file to restore your data or transfer from another device.
              </p>
              <Input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
                id="import-data"
                disabled={isImporting}
              />
              <label htmlFor="import-data">
                <Button variant="outline" className="w-full" disabled={isImporting} asChild>
                  <span>
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isImporting ? 'Importing...' : 'Import JSON'}
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">About Export Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="font-semibold mb-1">📄 Resale Packet</p>
            <p>
              Creates a comprehensive, professional report perfect for documenting
              your vehicle's maintenance when selling. Increases buyer confidence
              and can help justify your asking price.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">📊 CSV Export</p>
            <p>
              Exports service data in spreadsheet format for analysis, graphing,
              or importing into other tools. Track spending patterns and maintenance frequency.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">💾 Backup & Transfer</p>
            <p>
              All data is stored locally in your browser. Regular backups protect
              against data loss and make it easy to transfer your maintenance
              history between devices.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}