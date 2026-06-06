import { getDb } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, AlertTriangle, Clock, Download, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const db = await getDb();
  
  // Fetch stats
  const totalDonations = await db.get('SELECT COUNT(*) as count FROM donations') as { count: number };
  const verifiedDonations = await db.get('SELECT COUNT(*) as count FROM donations WHERE verification_status = "VERIFIED"') as { count: number };
  const flaggedDonations = await db.get('SELECT COUNT(*) as count FROM donations WHERE verification_status = "FLAGGED"') as { count: number };
  const pendingDonations = await db.get('SELECT COUNT(*) as count FROM donations WHERE verification_status = "PENDING"') as { count: number };
  
  const totalAmountRow = await db.get('SELECT SUM(amount) as total FROM donations WHERE verification_status = "VERIFIED"') as { total: number };
  const totalAmount = totalAmountRow?.total || 0;

  // Fetch recent donations
  const donations = await db.all('SELECT * FROM donations ORDER BY timestamp DESC LIMIT 50');

  // We could add charts here but for the MVP let's focus on the stats and the table
  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Verified</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Entries</CardTitle>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonations.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Verified</CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedDonations.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Flagged</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedDonations.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDonations.count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Donations</CardTitle>
          <a href="/api/admin/export" download>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </a>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="text-slate-500">{new Date(d.timestamp).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{d.donor_name}</TableCell>
                  <TableCell>PKR {d.amount?.toLocaleString()}</TableCell>
                  <TableCell>{d.bank_name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.reference_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.campaign}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      d.verification_status === 'VERIFIED' ? 'default' : 
                      d.verification_status === 'FLAGGED' ? 'destructive' : 'secondary'
                    }>
                      {d.verification_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {donations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No donations recorded yet.
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
