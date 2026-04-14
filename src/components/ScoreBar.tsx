interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
}

const ScoreBar = ({ label, value, max = 100 }: ScoreBarProps) => {
  const pct = Math.min((value / max) * 100, 100);
  const getColor = () => {
    if (value >= 76) return 'bg-score-green';
    if (value >= 51) return 'bg-primary';
    return 'bg-score-red';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor()}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ScoreBar;
