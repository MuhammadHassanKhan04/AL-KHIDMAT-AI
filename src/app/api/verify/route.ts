import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// Using Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ExtractedData {
  amount: string;
  transactionTime: string;
  transactionDate: string;
  referenceNumber: string;
  bankName: string;
  senderName: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured. Please add your real API key to the .env file.' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare image for Gemini
    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: file.type,
      },
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an expert AI extraction agent.
      Extract the following details from this payment screenshot and return ONLY a strict JSON object.
      Do not include any markdown formatting like \`\`\`json.
      
      Required fields:
      - "amount": The numeric amount without commas (e.g. "10000" not "10,000")
      - "transactionTime": Time of transaction (if not found, return empty string)
      - "transactionDate": Date in DD-MMM-YY format (e.g., "11-Mar-26")
      - "referenceNumber": The transaction ID or reference number (just the digits/alphanumeric characters)
      - "bankName": Name of the bank
      - "senderName": Name of the person who sent the money
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let extracted: ExtractedData;
    try {
      extracted = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response", responseText);
      return NextResponse.json({ error: 'Failed to extract data clearly' }, { status: 500 });
    }

    // Ensure data directory exists
    const dataDirectory = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    // Read CSV for verification
    const csvPath = path.join(dataDirectory, 'bank_statement.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ extracted, status: 'PENDING', message: 'No bank statement available to verify against' });
    }

    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    let verificationStatus = 'MISMATCHED';

    // Debug: log extracted data
    console.log('Extracted data from image:', extracted);



    // Normalize extracted values for comparison
    const extractedAmountNorm = String(extracted.amount).replace(/[,\s]/g, '');
    const extractedRefNorm = (extracted.referenceNumber || '').replace(/\s/g, '').toLowerCase();
    
    // Check against rows
    for (const row of parsed.data as any[]) {
      const rowDetails = (row['Transaction Details'] || '').toString().replace(/\s/g, '').toLowerCase();
      const rowAmountStr = row['Amount'] ? String(row['Amount']).replace(/[,\s]/g, '') : '';

      const amountMatches = rowAmountStr === extractedAmountNorm;
      const refMatches = rowDetails.includes(extractedRefNorm);

      if (amountMatches && refMatches) {
        verificationStatus = 'VERIFIED';
        break;
      }
    }

    // Write verification result to a unified CSV log
    const resultsPath = path.join(dataDirectory, 'donation_results.csv');
    const resultLine = `\n${new Date().toISOString()},"${extracted.senderName}","${extracted.bankName}",${extracted.amount},"${extracted.transactionDate}","${extracted.referenceNumber}","${verificationStatus}"`;
    if (!fs.existsSync(resultsPath)) {
      fs.writeFileSync(resultsPath, 'Timestamp,Sender Name,Bank Name,Amount,Transaction Date,Reference Number,Status' + resultLine);
    } else {
      fs.appendFileSync(resultsPath, resultLine);
    }
    // If verified, also log to a dedicated verified donations CSV
    if (verificationStatus === 'VERIFIED') {
      const verifiedPath = path.join(dataDirectory, 'verified_donations.csv');
      const verifiedLine = `\n${new Date().toISOString()},"${extracted.senderName}","${extracted.bankName}",${extracted.amount},"${extracted.transactionDate}","${extracted.referenceNumber}"`;
      if (!fs.existsSync(verifiedPath)) {
        fs.writeFileSync(verifiedPath, 'Timestamp,Sender Name,Bank Name,Amount,Transaction Date,Reference Number' + verifiedLine);
      } else {
        fs.appendFileSync(verifiedPath, verifiedLine);
      }
    }
    // Existing mismatched handling (optional, kept for backward compatibility)
    if (verificationStatus === 'MISMATCHED') {
      const mismatchedPath = path.join(dataDirectory, 'mismatched_donations.csv');
      const csvLine = `\n${new Date().toISOString()},"${extracted.senderName}","${extracted.bankName}",${extracted.amount},"${extracted.transactionDate}","${extracted.referenceNumber}"`;
      if (!fs.existsSync(mismatchedPath)) {
        fs.writeFileSync(mismatchedPath, 'Timestamp,Sender Name,Bank Name,Amount,Transaction Date,Reference Number' + csvLine);
      } else {
        fs.appendFileSync(mismatchedPath, csvLine);
      }
    }
    return NextResponse.json({
      extracted,
      status: verificationStatus
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
