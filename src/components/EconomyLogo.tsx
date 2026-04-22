import { cn } from '@/lib/utils';

interface EconomyLogoProps {
  economy: { name: string; logo_url?: string | null };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-20 w-20 text-2xl',
};

const EconomyLogo = ({ economy, size = 'lg', className }: EconomyLogoProps) => {
  const initials = economy.name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (economy.logo_url) {
    return (
      <img
        src={economy.logo_url}
        alt={economy.name}
        className={cn('rounded-full border-2 border-score-amber bg-foreground object-cover', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div className={cn('flex items-center justify-center rounded-full border-2 border-score-amber bg-secondary font-bold text-score-amber', sizeClasses[size], className)}>
      {initials}
    </div>
  );
};

export default EconomyLogo;