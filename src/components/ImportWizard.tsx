import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  FileUp,
  Loader,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ImportRecord,
  checkForDuplicate,
  handleDuplicate,
  logImportAction,
  DuplicateCheckResult,
} from '@/services/duplicateDetection';
import { DuplicateDetectionDialog } from './DuplicateDetectionDialog';

export interface ImportWizardProps {
  onImportComplete?: (results: ImportResults) => void;
}

export interface ImportResults {
  total: number;
  imported: number;
  skipped: number;
  updated: number;
  merged: number;
  failed: number;
}

export function ImportWizard({ onImportComplete }: ImportWizardProps) {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ImportResults>({
    total: 0,
    imported: 0,
    skipped: 0,
    updated: 0,
    merged: 0,
    failed: 0,
  });

  const [duplicateDialog, setDuplicateDialog] = useState({
    isOpen: false,
    record: null as ImportRecord | null,
    duplicateCheck: null as DuplicateCheckResult | null,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [importStarted, setImportStarted] = useState(false);

  /**
   * Handle file upload
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Support CSV and XLSX
      if (file.type === 'text/csv') {
        const text = await file.text();
        const importedRecords = parseCSV(text);
        setRecords(importedRecords);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        const importedRecords = await parseXLSX(file);
        setRecords(importedRecords);
      } else {
        toast.error('Unsupported file format. Please use CSV or XLSX.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Error parsing file. Please check the format.');
    }
  };

  /**
   * Parse CSV file
   */
  const parseCSV = (csv: string): ImportRecord[] => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const record: any = {};

      headers.forEach((header, index) => {
        const key = mapHeaderToField(header);
        record[key] = values[index];
      });

      return normalizeRecord(record);
    });
  };

  /**
   * Parse XLSX file
   */
  const parseXLSX = async (file: File): Promise<ImportRecord[]> => {
    const { read, utils } = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(worksheet);

    return data.map((row: any) => {
      const record: any = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = mapHeaderToField(key.toLowerCase());
        record[mappedKey] = value;
      });
      return normalizeRecord(record);
    });
  };

  /**
   * Map header names to standardized field names
   */
  const mapHeaderToField = (header: string): string => {
    const mapping: { [key: string]: string } = {
      'invoice no': 'invoiceNumber',
      'invoice number': 'invoiceNumber',
      'invoice #': 'invoiceNumber',
      'phone': 'customerPhone',
      'customer phone': 'customerPhone',
      'phone number': 'customerPhone',
      'date': 'orderDate',
      'order date': 'orderDate',
      'product': 'product',
      'amount': 'amount',
      'total': 'amount',
    };

    return mapping[header] || header;
  };

  /**
   * Normalize record data
   */
  const normalizeRecord = (record: any): ImportRecord => {
    return {
      invoiceNumber: String(record.invoiceNumber || '').trim(),
      customerPhone: String(record.customerPhone || '').replace(/\D/g, ''),
      orderDate: String(record.orderDate || '').trim(),
      product: String(record.product || '').trim(),
      amount: parseFloat(record.amount) || 0,
      ...record,
    };
  };

  /**
   * Process import with duplicate detection
   */
  const processImport = async () => {
    if (records.length === 0) {
      toast.error('No records to import');
      return;
    }

    setImportStarted(true);
    setIsProcessing(true);

    const newResults: ImportResults = {
      total: records.length,
      imported: 0,
      skipped: 0,
      updated: 0,
      merged: 0,
      failed: 0,
    };

    for (let i = 0; i < records.length; i++) {
      setCurrentIndex(i);
      const record = records[i];

      try {
        // Check for duplicates
        const duplicateCheck = await checkForDuplicate(record);

        if (duplicateCheck.isDuplicate) {
          // Show dialog and wait for user action
          setDuplicateDialog({
            isOpen: true,
            record,
            duplicateCheck,
          });

          // Wait for user to resolve
          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (!duplicateDialog.isOpen) {
                clearInterval(checkInterval);
                resolve(null);
              }
            }, 100);
          });
        } else {
          // No duplicate, create new record
          await handleDuplicate(record, undefined, 'create');
          newResults.imported++;
        }
      } catch (error) {
        console.error(`Error processing record ${i + 1}:`, error);
        newResults.failed++;
        toast.error(`Failed to process record ${i + 1}`);
      }
    }

    setResults(newResults);
    setIsProcessing(false);
    onImportComplete?.(newResults);
  };

  /**
   * Handle duplicate resolution
   */
  const handleDuplicateResolution = async (action: 'skip' | 'update' | 'merge' | 'create') => {
    try {
      const record = duplicateDialog.record!;
      const duplicateCheck = duplicateDialog.duplicateCheck!;

      await handleDuplicate(
        record,
        duplicateCheck.existingRecord,
        action,
        'sales',
        'current-user@example.com'
      );

      // Update results
      setResults((prev) => ({
        ...prev,
        [action === 'create'
          ? 'imported'
          : action === 'skip'
            ? 'skipped'
            : action === 'update'
              ? 'updated'
              : 'merged']: prev[
          action === 'create'
            ? 'imported'
            : action === 'skip'
              ? 'skipped'
              : action === 'update'
                ? 'updated'
                : 'merged'
        ] + 1,
      }));

      setDuplicateDialog({ isOpen: false, record: null, duplicateCheck: null });
      toast.success(`Record ${action}${action === 'skip' ? 'ped' : action.endsWith('e') ? 'd' : 'ed'} successfully`);
    } catch (error) {
      console.error('Error resolving duplicate:', error);
      toast.error('Failed to resolve duplicate');
    }
  };

  const isImportComplete = importStarted && currentIndex >= records.length - 1;
  const progress = records.length > 0 ? ((currentIndex + 1) / records.length) * 100 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!importStarted ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Import Sales Records
            </CardTitle>
            <CardDescription>
              Upload a CSV or XLSX file with columns: Invoice Number, Customer Phone, Order Date, Product, Amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-semibold">Drop your file here or click to upload</p>
                  <p className="text-sm text-gray-500">CSV or XLSX files are supported</p>
                </label>
              </div>

              {records.length > 0 && (
                <div className="space-y-3">
                  <Badge variant="outline">{records.length} records ready to import</Badge>
                  <Button onClick={processImport} size="lg" className="w-full">
                    Start Import
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
              <CardDescription>
                Processing record {currentIndex + 1} of {records.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />

              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                <div>
                  <p className="font-semibold text-lg">{results.imported}</p>
                  <p className="text-gray-600">Imported</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{results.updated}</p>
                  <p className="text-gray-600">Updated</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{results.merged}</p>
                  <p className="text-gray-600">Merged</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{results.skipped}</p>
                  <p className="text-gray-600">Skipped</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{results.failed}</p>
                  <p className="text-gray-600">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          {isImportComplete && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle className="h-5 w-5" />
                  Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-800">
                  Successfully processed {results.total} records.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Duplicate Detection Dialog */}
      {duplicateDialog.record && duplicateDialog.duplicateCheck && (
        <DuplicateDetectionDialog
          isOpen={duplicateDialog.isOpen}
          importedRecord={duplicateDialog.record}
          duplicateCheckResult={duplicateDialog.duplicateCheck}
          onResolve={handleDuplicateResolution}
          isLoading={isProcessing}
        />
      )}
    </div>
  );
}
