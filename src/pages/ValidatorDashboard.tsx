import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const pendingItems = [
  { id: '1', type: 'merchant', title: 'La Tienda BTC', detail: 'Category: retail · Payment: Lightning, On-chain', submittedBy: 'anonymous', time: '2 hours ago', votes: { approve: 1, reject: 0, needed: 2 } },
  { id: '2', type: 'earner', title: 'Market vendor', detail: 'Direct BTC payment · Lightning', submittedBy: 'user@email.com', time: '5 hours ago', votes: { approve: 0, reject: 0, needed: 2 } },
  { id: '3', type: 'transaction', title: '85,000 sats — Food', detail: 'Circular: Yes · Date: Apr 3, 2026', submittedBy: 'anonymous', time: '6 hours ago', votes: { approve: 1, reject: 0, needed: 2 } },
  { id: '4', type: 'merchant', title: 'BTC Surf Rentals', detail: 'Category: services · Payment: Lightning', submittedBy: 'user2@email.com', time: '1 day ago', votes: { approve: 0, reject: 1, needed: 2 } },
];

const ValidatorDashboard = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Validator Dashboard</h1>
          <p className="text-sm text-muted-foreground">{pendingItems.length} items pending review</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Reviewed: <span className="font-mono text-foreground">47</span></div>
          <div>Approval rate: <span className="font-mono text-foreground">89%</span></div>
        </div>
      </div>

      <div className="space-y-4">
        {pendingItems.map(item => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                  <span className="font-medium">{item.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted by {item.submittedBy} · {item.time}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{item.votes.approve}/{item.votes.needed} approvals</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Textarea placeholder="Optional note..." className="h-8 min-h-[32px] text-xs flex-1 ml-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ValidatorDashboard;
