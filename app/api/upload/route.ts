import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDay, isValid } from 'date-fns';

// --- LOGIC CONSTANTS ---
const WEEKDAY_HOURS = 8.5;
const SATURDAY_HOURS = 4.0;
const SUNDAY_HOURS = 0;

// --- HELPER FUNCTIONS ---
function parseDateString(dateVal: any): Date {
  if (dateVal instanceof Date) return dateVal;
  const d = new Date(dateVal);
  return isValid(d) ? d : new Date();
}

function calculateDailyMetrics(row: any) {
  // 1. Get Date and Day
  const dateRaw = row['Date'] || row['date']; 
  const date = parseDateString(dateRaw);
  const dayIndex = getDay(date); // 0=Sun, 6=Sat

  // 2. Set Expected Hours
  let expected = WEEKDAY_HOURS;
  let dayName = 'Weekday';

  if (dayIndex === 0) {
    dayName = 'Sunday';
    expected = SUNDAY_HOURS;
  } else if (dayIndex === 6) {
    dayName = 'Saturday';
    expected = SATURDAY_HOURS;
  }

  // 3. Calculate Worked Hours
  let worked = 0;
  let isLeave = false;
  
  const inTime = row['In-Time'] || row['in-time'];
  const outTime = row['Out-Time'] || row['out-time'];

  // Rule: If it's not Sunday, and times are missing -> Leave
  if (dayIndex !== 0) {
    if (!inTime || !outTime) {
      isLeave = true;
      worked = 0;
    } else {
      // Parse "10:00" strings
      const [inH, inM] = String(inTime).split(':').map(Number);
      const [outH, outM] = String(outTime).split(':').map(Number);
      
      const startMins = inH * 60 + inM;
      const endMins = outH * 60 + outM;
      const diff = endMins - startMins;

      worked = diff > 0 ? Number((diff / 60).toFixed(2)) : 0;
    }
  }

  return {
    date: date.toISOString(),
    dayName,
    inTime: inTime || '-',
    outTime: outTime || '-',
    expectedHours: expected,
    workedHours: worked,
    isLeave
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    /* READ EXCEL */
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

    /* PROCESS DATA */
    const records: any[] = [];
    let totalExpected = 0;
    let totalWorked = 0;
    let leavesTaken = 0;
    let employeeName = "Unknown Employee";

    jsonData.forEach((row: any, index) => {
      if (index === 0 && row['Employee Name']) employeeName = row['Employee Name'];
      
      const metrics = calculateDailyMetrics(row);
      records.push(metrics);

      totalExpected += metrics.expectedHours;
      totalWorked += metrics.workedHours;
      if (metrics.isLeave) leavesTaken++;
    });

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
    console.error(error);
    return NextResponse.json({ error: "Processing Failed" }, { status: 500 });
  }
}