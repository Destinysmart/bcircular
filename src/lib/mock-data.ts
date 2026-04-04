export interface Community {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  description: string;
  score: number;
  merchants: number;
  earners: number;
  transactions: number;
  satsCircular: number;
  weeklyChange: number;
  status: 'active' | 'pending';
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  paymentMethods: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface ScoreHistory {
  date: string;
  score: number;
  merchants: number;
  earners: number;
}

export interface ActivityItem {
  id: string;
  type: 'merchant' | 'earner' | 'transaction';
  description: string;
  timestamp: string;
}

export const mockCommunities: Community[] = [
  { id: '1', name: 'Bitcoin Beach', slug: 'bitcoin-beach', country: 'El Salvador', countryCode: 'SV', city: 'El Zonte', region: 'Latin America', description: 'The original Bitcoin circular economy in El Zonte, pioneering Lightning adoption for everyday commerce.', score: 87, merchants: 142, earners: 89, transactions: 3240, satsCircular: 48500000, weeklyChange: 3, status: 'active' },
  { id: '2', name: 'Bitcoin Ekasi', slug: 'bitcoin-ekasi', country: 'South Africa', countryCode: 'ZA', city: 'Mossel Bay', region: 'Africa', description: 'Community-driven Bitcoin adoption in a South African township.', score: 72, merchants: 68, earners: 45, transactions: 1890, satsCircular: 22000000, weeklyChange: 5, status: 'active' },
  { id: '3', name: 'Bitcoin Jungle', slug: 'bitcoin-jungle', country: 'Costa Rica', countryCode: 'CR', city: 'Uvita', region: 'Latin America', description: 'Sustainable Bitcoin circular economy in the Pacific coast of Costa Rica.', score: 69, merchants: 94, earners: 52, transactions: 2100, satsCircular: 31000000, weeklyChange: -2, status: 'active' },
  { id: '4', name: 'Bitcoin Lake', slug: 'bitcoin-lake', country: 'Guatemala', countryCode: 'GT', city: 'Panajachel', region: 'Latin America', description: 'Bitcoin education and adoption around Lake Atitlán.', score: 58, merchants: 37, earners: 28, transactions: 890, satsCircular: 12000000, weeklyChange: 1, status: 'active' },
  { id: '5', name: 'Lugano Plan ₿', slug: 'lugano-plan-b', country: 'Switzerland', countryCode: 'CH', city: 'Lugano', region: 'Europe', description: 'City-wide Bitcoin and crypto adoption initiative in Lugano.', score: 81, merchants: 210, earners: 34, transactions: 4500, satsCircular: 95000000, weeklyChange: 2, status: 'active' },
  { id: '6', name: 'Bitcoin Island', slug: 'bitcoin-island', country: 'Philippines', countryCode: 'PH', city: 'Boracay', region: 'Asia', description: 'Tropical Bitcoin circular economy on Boracay Island.', score: 45, merchants: 23, earners: 18, transactions: 420, satsCircular: 5600000, weeklyChange: 8, status: 'active' },
  { id: '7', name: 'Ikorodu Bitcoin', slug: 'ikorodu', country: 'Nigeria', countryCode: 'NG', city: 'Ikorodu', region: 'Africa', description: 'Grassroots Bitcoin adoption in Lagos suburb.', score: 51, merchants: 31, earners: 42, transactions: 780, satsCircular: 9200000, weeklyChange: 12, status: 'active' },
  { id: '8', name: 'Bitcoin Senegal', slug: 'bitcoin-senegal', country: 'Senegal', countryCode: 'SN', city: 'Dakar', region: 'Africa', description: 'Bitcoin circular economy in Dakar markets.', score: 38, merchants: 15, earners: 22, transactions: 310, satsCircular: 3800000, weeklyChange: 4, status: 'active' },
];

export const mockMerchants: Merchant[] = [
  { id: '1', name: 'Mama Rosa\'s Kitchen', category: 'food', lat: 13.4943, lng: -89.3839, paymentMethods: ['lightning', 'onchain'], status: 'approved' },
  { id: '2', name: 'Surf & Sip Café', category: 'food', lat: 13.4950, lng: -89.3820, paymentMethods: ['lightning'], status: 'approved' },
  { id: '3', name: 'El Zonte General Store', category: 'retail', lat: 13.4935, lng: -89.3845, paymentMethods: ['lightning', 'blink'], status: 'approved' },
  { id: '4', name: 'Beach Transport Co', category: 'transport', lat: 13.4960, lng: -89.3830, paymentMethods: ['lightning'], status: 'approved' },
  { id: '5', name: 'Bitcoin Academy', category: 'education', lat: 13.4940, lng: -89.3850, paymentMethods: ['lightning', 'onchain', 'lnurlp'], status: 'approved' },
];

export const mockScoreHistory: ScoreHistory[] = [
  { date: '2025-07', score: 62, merchants: 95, earners: 50 },
  { date: '2025-08', score: 65, merchants: 102, earners: 55 },
  { date: '2025-09', score: 70, merchants: 110, earners: 61 },
  { date: '2025-10', score: 73, merchants: 118, earners: 68 },
  { date: '2025-11', score: 78, merchants: 128, earners: 75 },
  { date: '2025-12', score: 80, merchants: 133, earners: 80 },
  { date: '2026-01', score: 82, merchants: 136, earners: 83 },
  { date: '2026-02', score: 84, merchants: 139, earners: 86 },
  { date: '2026-03', score: 87, merchants: 142, earners: 89 },
];

export const mockActivity: ActivityItem[] = [
  { id: '1', type: 'merchant', description: 'New merchant approved: Mama Rosa\'s Kitchen', timestamp: '2 hours ago' },
  { id: '2', type: 'transaction', description: '45,000 sats circular transaction recorded', timestamp: '3 hours ago' },
  { id: '3', type: 'earner', description: 'New earner verified: market vendor', timestamp: '5 hours ago' },
  { id: '4', type: 'merchant', description: 'New merchant approved: Surf & Sip Café', timestamp: '8 hours ago' },
  { id: '5', type: 'transaction', description: '120,000 sats circular transaction recorded', timestamp: '12 hours ago' },
  { id: '6', type: 'earner', description: 'New earner verified: freelance developer', timestamp: '1 day ago' },
  { id: '7', type: 'merchant', description: 'New merchant approved: Beach Transport Co', timestamp: '1 day ago' },
  { id: '8', type: 'transaction', description: '78,000 sats circular transaction recorded', timestamp: '2 days ago' },
];

export const getScoreColor = (score: number): string => {
  if (score >= 76) return 'text-emerald-400';
  if (score >= 51) return 'text-primary';
  return 'text-red-400';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 76) return 'bg-emerald-400';
  if (score >= 51) return 'bg-primary';
  return 'bg-red-400';
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
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
