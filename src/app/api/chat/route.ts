import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      message, 
      extractedData, 
      verificationStatus 
    } = body;

    let campaign = 'General Donation';
    let confidenceScore = 1.0;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured. Please add your real API key to the .env file.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an AI assistant for Al-Khidmat Foundation.
      Classify the following donation intent message into one of the following exact campaign names:
      - Gaza Relief
      - Orphan Sponsorship
      - Ambulance Fund
      - Ration Drive
      - General Donation

      Message: "${message}"

      Return ONLY a strict JSON object (no markdown) with two keys:
      "campaign": The exact name of the matched campaign.
      "confidenceScore": A number between 0 and 1 indicating how confident you are.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const classified = JSON.parse(responseText);
      campaign = classified.campaign || 'General Donation';
      confidenceScore = classified.confidenceScore || 1.0;
    } catch (e) {
      console.error("Failed to parse classification", responseText);
    }

    // Save to database
    const db = await getDb();
    
    // Check if reference number already exists to avoid duplicates
    const existing = await db.get('SELECT id FROM donations WHERE reference_number = ?', [extractedData.referenceNumber]);
    
    if (!existing) {
      await db.run(`
        INSERT INTO donations 
        (donor_name, bank_name, amount, transaction_date, reference_number, verification_status, campaign, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        extractedData.senderName,
        extractedData.bankName,
        Number(extractedData.amount),
        extractedData.transactionDate,
        extractedData.referenceNumber,
        verificationStatus,
        campaign,
        confidenceScore
      ]);
    }

    // Save verified to CSV
    if (verificationStatus === 'VERIFIED') {
      const verifiedPath = path.join(process.cwd(), 'data', 'verified_donations.csv');
      const csvLine = `\\n${new Date().toISOString()},"${extractedData.senderName}","${extractedData.bankName}",${extractedData.amount},"${extractedData.transactionDate}","${extractedData.referenceNumber}","${campaign}",${confidenceScore}`;
      if (!fs.existsSync(verifiedPath)) {
        fs.writeFileSync(verifiedPath, 'Timestamp,Sender Name,Bank Name,Amount,Transaction Date,Reference Number,Campaign,Confidence Score' + csvLine);
      } else {
        fs.appendFileSync(verifiedPath, csvLine);
      }
    }

    // Generate confirmation message
    const confirmationMessage = `*Donation Verified Successfully*\n\nAmount: PKR ${extractedData.amount}\nCampaign: ${campaign}\nReference: ${extractedData.referenceNumber}\n\nThank you for supporting Al-Khidmat.`;

    return NextResponse.json({
      campaign,
      confidenceScore,
      reply: confirmationMessage
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
