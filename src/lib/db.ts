// Lazy import sqlite3 and sqlite inside getDb to avoid native module loading at build time
// import sqlite3 from 'sqlite3';
import path from 'path';

let dbPromise: Promise<any> | null = null;

export async function getDb() {
  // Dynamically import sqlite3 and sqlite only when needed (runtime)
  const sqlite3 = (await import('sqlite3')).default;
  const { open } = await import('sqlite');

  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    }).then(async (db) => {
      // Initialize Schema
      await db.exec(`
        CREATE TABLE IF NOT EXISTS donations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          donor_name TEXT,
          bank_name TEXT,
          amount REAL,
          transaction_date TEXT,
          reference_number TEXT UNIQUE,
          verification_status TEXT,
          campaign TEXT,
          confidence_score REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaigns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS blood_donors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          gender TEXT,
          dob TEXT,
          blood_group TEXT,
          last_donation_date TEXT
        );
      `);

      // Seed campaigns
      const campaigns = [
        'Gaza Relief',
        'Orphan Sponsorship',
        'Ambulance Fund',
        'Ration Drive',
        'General Donation'
      ];
      for (const campaign of campaigns) {
        await db.run('INSERT OR IGNORE INTO campaigns (name) VALUES (?)', campaign);
      }

      // Seed mock blood donors
      const countDonors = await db.get('SELECT COUNT(*) as count FROM blood_donors');
      if (countDonors.count === 0) {
        const donors = [
          ['Ali Raza', 'Male', '1995-05-12', 'O+', '2025-10-15'],
          ['Fatima Noor', 'Female', '1998-08-20', 'A+', '2026-01-10'],
          ['Ahmed Khan', 'Male', '1990-03-25', 'B-', '2025-06-05'],
          ['Zainab Ali', 'Female', '2001-11-30', 'O-', '2025-12-20'],
          ['Umar Farooq', 'Male', '1993-07-14', 'AB+', '2026-02-28']
        ];
        
        for (const d of donors) {
          await db.run(
            'INSERT INTO blood_donors (name, gender, dob, blood_group, last_donation_date) VALUES (?, ?, ?, ?, ?)',
            d[0], d[1], d[2], d[3], d[4]
          );
        }
      }

      return db;
    });
  }
  return dbPromise;
}
