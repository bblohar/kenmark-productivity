import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Explicitly prevent static caching (Fixes Vercel build issues)
export const dynamic = 'force-dynamic';

// --- CONFIGURATION ---
const WEEKDAY_HOURS = 8.5;
const SATURDAY_HOURS = 4.0;
const SUNDAY_HOURS = 0;

// --- TYPES ---
interface ExcelRow {
  'Employee Name'?: string;
  'Date': string | number;
  'In-Time'?: string | number;
  'Out-Time'?: string | number;
  [key: string]: any; // Allow flexible columns
}

// --- HELPER FUNCTIONS ---

// 1. Safe Time Parser: Handles "10:00" (colon) and "10.00" (dot)
function parseTime(timeVal: string | number | undefined): { str: string, mins: number } | null {
  if (!timeVal) return null;
  
  const timeStr = String(timeVal).trim();
  if (!timeStr) return null;

  // Split by either colon or dot
  const separator = timeStr.includes(':') ? ':' : '.';
  const parts = timeStr.split(separator);

  if (parts.length < 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  return {
    str: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    mins: (hours * 60) + minutes
  };
}

// 2. Safe Date Parser: Handles Excel Serial Numbers & Strings
function parseDate(dateVal: any): Date {
  if (dateVal instanceof Date) return dateVal;
  
  // Excel Serial Number Logic (e.g., 45200)
  if (typeof dateVal === 'number') {
    return new Date(Math.round((dateVal - 25569) * 86400 * 1000));
  }
  
  // Standard String Logic
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d; // Fallback to Today if invalid
}

function calculateDailyMetrics(row: ExcelRow) {
  // --- A. Date Processing ---
  const date = parseDate(row['Date']);
  const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday

  // --- B. Expected Hours Logic ---
  let expected = WEEKDAY_HOURS;
  let dayName = 'Weekday';

  if (dayIndex === 0) {
    dayName = 'Sunday';
    expected = SUNDAY_HOURS;
  } else if (dayIndex === 6) {
    dayName = 'Saturday';
    expected = SATURDAY_HOURS;
  }

  // --- C. Worked Hours Logic ---
  let worked = 0;
  let isLeave = false;
  
  const inObj = parseTime(row['In-Time']);
  const outObj = parseTime(row['Out-Time']);

  // Leave Logic: If it's a workday AND (In or Out is missing)
  if (dayIndex !== 0) {
    if (!inObj || !outObj) {
      isLeave = true;
      worked = 0;
    } else {
      const diffMins = outObj.mins - inObj.mins;
      // Convert mins to hours (e.g., 90 mins -> 1.5 hrs)
      worked = diffMins > 0 ? Number((diffMins / 60).toFixed(2)) : 0;
    }
  }

  return {
    date: date.toISOString(),
    dayName,
    inTime: inObj ? inObj.str : '-',
    outTime: outObj ? outObj.str : '-',
    expectedHours: expected,
    workedHours: worked,
    isLeave
  };
}

// --- MAIN API HANDLER ---
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // 1. Read Excel File
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    
    // Safety check for empty workbook
    if (workbook.SheetNames.length === 0) {
      return NextResponse.json({ success: false, error: "Excel file is empty" }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // raw: false tries to keep strings, dateNF helps format standard dates
    const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' }) as ExcelRow[];

    if (jsonData.length === 0) {
      return NextResponse.json({ success: false, error: "No data found in sheet" }, { status: 400 });
    }

    // 2. Process Records
    const records: any[] = [];
    let totalExpected = 0;
    let totalWorked = 0;
    let leavesTaken = 0;
    let employeeName = "Unknown Employee";

    jsonData.forEach((row, index) => {
      // Extract Name from first row if available
      if (index === 0 && row['Employee Name']) {
        employeeName = String(row['Employee Name']);
      }
      
      const metrics = calculateDailyMetrics(row);
      records.push(metrics);

      totalExpected += metrics.expectedHours;
      totalWorked += metrics.workedHours;
      if (metrics.isLeave) leavesTaken++;
    });

    // 3. Calculate Final Productivity
    const productivity = totalExpected > 0 
      ? ((totalWorked / totalExpected) * 100).toFixed(1) 
      : "0.0";

    return NextResponse.json({
      success: true,
      data: {
        employeeName,
        totalExpected,
        totalWorked,
        leavesTaken,
        productivity,
        records
      }
    });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}