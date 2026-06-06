import { getDb } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Search, Droplet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BloodDonorsPage({
  searchParams,
}: {
  searchParams: { bg?: string }
}) {
  const db = await getDb();
  
  // Search parameters
  // Ensure we await the searchParams correctly if needed in next 15 (page props are promises in app router dynamic pages)
  const queryBg = searchParams?.bg || '';

  let donors = [];
  if (queryBg) {
    donors = await db.all('SELECT * FROM blood_donors WHERE blood_group LIKE ?', [`%${queryBg}%`]);
  } else {
    donors = await db.all('SELECT * FROM blood_donors');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Real-Time Blood Donor Matching</h1>
          <p className="text-slate-500">Find matching blood donors from the Al-Khidmat database.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplet className="w-5 h-5 text-red-500" />
            Donor Registry
          </CardTitle>
          <form action={async (formData) => {
            'use server';
            const bg = formData.get('bg') as string;
            redirect(`/admin/blood-donors?bg=${encodeURIComponent(bg)}`);
          }} className="flex gap-2 max-w-sm w-full">
            <Input 
              name="bg" 
              placeholder="Search Blood Group (e.g., O+, A-)" 
              defaultValue={queryBg}
              className="bg-white"
            />
            <Button type="submit" variant="default" className="bg-red-600 hover:bg-red-700">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead className="pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.map((d: any) => {
                const lastDonationDate = new Date(d.last_donation_date);
                const isEligible = (Date.now() - lastDonationDate.getTime()) > (90 * 24 * 60 * 60 * 1000); // 90 days
                
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium pl-6">{d.name}</TableCell>
                    <TableCell>{d.gender}</TableCell>
                    <TableCell>{d.dob}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold">
                        {d.blood_group}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{d.last_donation_date}</TableCell>
                    <TableCell className="pr-6 text-right">
                      {isEligible ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Eligible</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Wait Period</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {donors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <Droplet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    No matching donors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
