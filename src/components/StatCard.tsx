interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
      {icon}
      {label}
    </div>
    <div className="font-mono text-2xl font-medium text-foreground">{value}</div>
  </div>
);

export default StatCard;
