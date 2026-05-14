'use client';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  sheetName?: string;
}

export default function ExportButton({ data, filename, sheetName = 'Sheet1' }: ExportButtonProps) {
  if (!data || data.length === 0) return null;

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={exportExcel}>
      <Download className="h-4 w-4 mr-1" /> Export
    </Button>
  );
}
