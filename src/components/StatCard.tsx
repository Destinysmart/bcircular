interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
}

const StatCard = ({ label, value, icon, subtitle }: StatCardProps) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
      {icon}
      {label}
    </div>
    <div className="font-mono text-2xl font-semibold text-foreground">{value}</div>
    {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
  </div>
);

export default StatCard;
