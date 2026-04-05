import { Badge } from '@/components/ui/badge';

interface ConfidenceBadgeProps {
  totalApproved: number;
}

const ConfidenceBadge = ({ totalApproved }: ConfidenceBadgeProps) => {
  let level: string;
  let variant: 'default' | 'secondary' | 'destructive' | 'outline';

  if (totalApproved >= 20) {
    level = 'High';
    variant = 'default';
  } else if (totalApproved >= 5) {
    level = 'Medium';
    variant = 'secondary';
  } else {
    level = 'Low';
    variant = 'outline';
  }

  return (
    <Badge variant={variant} className="font-mono text-[10px]">
      {level} confidence
    </Badge>
  );
};

export default ConfidenceBadge;
