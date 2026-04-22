import { Badge } from '@/components/ui/badge';

interface ConfidenceBadgeProps {
  totalApproved: number;
  proofCount?: number;
}

const ConfidenceBadge = ({ totalApproved, proofCount }: ConfidenceBadgeProps) => {
  let level: string;
  let variant: 'default' | 'secondary' | 'destructive' | 'outline';

  if (proofCount !== undefined) {
    if (proofCount >= 5) {
      level = 'High';
      variant = 'default';
    } else if (proofCount >= 1) {
      level = 'Medium';
      variant = 'secondary';
    } else {
      level = 'Low';
      variant = 'outline';
    }
  } else if (totalApproved >= 20) {
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
    <Badge variant={variant} className="font-mono text-[10px] rounded-full">
      {level} confidence
    </Badge>
  );
};

export default ConfidenceBadge;
