import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const donations = await db.all('SELECT donor_name, bank_name, amount, transaction_date, reference_number, verification_status, campaign, confidence_score, timestamp FROM donations ORDER BY timestamp DESC');

    const csv = Papa.unparse(donations);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="donations_export.csv"',
      },
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse('Error generating export', { status: 500 });
  }
}
