export const getScoreColor = (score: number): string => {
  if (score >= 76) return 'text-score-green';
  if (score >= 51) return 'text-primary';
  return 'text-score-red';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 76) return 'bg-score-green';
  if (score >= 51) return 'bg-primary';
  return 'bg-score-red';
};

export const getScoreLabel = (score: number): string => {
  if (score >= 76) return 'Strong';
  if (score >= 51) return 'Growing';
  return 'Emerging';
};

export const formatSats = (sats: number): string => {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(1)}M`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(0)}K`;
  return sats.toString();
};

export const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
