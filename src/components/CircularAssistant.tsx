import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Send, Search, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENING = `Hi! I'm the Circular Assistant ⚡
I help Bitcoin circular economies get set up and grow on the platform.
What do you need help with?`;

const QUICK_REPLIES = [
  'How do I register my economy?',
  'What is a circularity score?',
  'How do I sync BTCMap?',
  'How do I appoint validators?',
  'How do I connect Blink wallet?',
  'What is FBCE tier?',
  'My score seems wrong',
];

interface Rule {
  keywords: string[];
  specificity: number;
  response: string;
}

const RULES: Rule[] = [
  {
    keywords: ['register', 'sign up', 'signup', 'join', 'new economy', 'add economy'],
    specificity: 2,
    response: `To register your Bitcoin circular economy:

1. Go to /register in the navigation
2. Fill in: economy name, city, country, population, and contact email
3. Submit — your economy goes into pending review
4. The Circular admin approves within 48hrs
5. Once approved, go to your Economy Admin Dashboard to:
   → Upload your logo and banner photo
   → Set your BTCMap community ID
   → Appoint validators
   → Connect your Blink wallet

Your economy will appear on the leaderboard once it has data. Need help with a specific step?`,
  },
  {
    keywords: ['btcmap', 'merchant', 'merchants', 'sync', 'verified'],
    specificity: 3,
    response: `To sync your Bitcoin merchants from BTCMap:

1. Find your BTCMap community ID at btcmap.org/communities
   → Copy just the ID from the URL
   → Example: 'bitcoin-beach' not the full URL

2. Go to your Economy Admin Dashboard
   → BTCMap Integration section
   → Paste your community ID
   → Click 'Sync from BTCMap'

This automatically imports all Bitcoin-accepting merchants in your area. BTCMap-verified merchants get a 1.5x trust weight in your score.

If you see wrong merchant counts:
→ Your bounding box may be too wide
→ Contact admin to tighten the coordinates

BTCMap syncs weekly automatically once set up.`,
  },
  {
    keywords: ['score', 'circularity', 'low score', 'improve score', 'points'],
    specificity: 2,
    response: `Your Circularity Score (0-100) is calculated from 5 pillars:

⚡ Merchant Saturation (25%)
   How many Bitcoin merchants per capita.
   Fix: Sync your BTCMap community ID

👥 Earner Penetration (20%)
   People earning income in Bitcoin.
   Fix: Submit earners via the submit form

🔄 Retention Rate (25%)
   % of sats staying in your economy vs cashing out to fiat.
   Fix: More circular transactions

📈 Transaction Velocity (15%)
   How often sats are moving.
   Fix: Connect your Blink wallet API

🚀 Growth Momentum (15%)
   New merchants and earners this month.
   Fix: Keep adding data regularly

Primary metrics shown on cards:
→ Monthly transactions (most important)
→ Activity rate (active days per month)

Score updates weekly automatically.`,
  },
  {
    keywords: ['validator', 'validators', 'validate', 'approve', 'submission', 'pending', 'review'],
    specificity: 3,
    response: `Validators are trusted community members who verify submitted data.

HOW IT WORKS:
→ Anyone can submit a merchant, earner or transaction (no login needed)
→ Your appointed validators review it
→ 2 out of 3 validators must approve
→ Approved data counts toward your score

TO APPOINT VALIDATORS:
1. Go to Economy Admin Dashboard
2. Scroll to Validators section
3. Enter the email of a trusted community member
4. They get access to the Validator Dashboard

VALIDATOR DASHBOARD (/validate):
→ Shows all pending submissions
→ Approve or reject with one click
→ Add a note explaining your decision

You need minimum 2 validators for your economy to be fully active.

Tip: Appoint people who know your community well and can verify merchants are real.`,
  },
  {
    keywords: ['blink', 'wallet', 'transaction', 'api key', 'connect wallet', 'lightning', 'sats'],
    specificity: 3,
    response: `To connect your Blink wallet and sync real transaction data:

1. Go to dashboard.blink.sv
2. Go to API → Create read-only API key
3. Copy the key
4. Go to your Economy Admin Dashboard
5. Find 'Blink Wallet API Key' section
6. Paste your read-only key → Connect

This automatically syncs:
→ Transaction count (monthly)
→ Activity rate (active days)
→ Sats flow between participants

IMPORTANT:
→ Only use READ-ONLY API keys
→ We never store private keys
→ No funds are ever held or touched
→ This is data only — pure analytics

Transaction data improves your Transaction Velocity and Activity Rate score pillars significantly.`,
  },
  {
    keywords: ['tier', 'fbce', 'classification', 'development', 'advanced', 'emerging'],
    specificity: 3,
    response: `FBCE Tiers classify your circular economy development level (1-5):

🟤 Tier 1 · Emerging
   Getting started — lead Bitcoiner identified, jurisdiction chosen, BTC used locally

🟡 Tier 2 · Emerging
   Growing — communication channels set up, local education sessions happening

🟢 Tier 3 · Advanced
   Established — lead organization formed, actively onboarding merchants

🔵 Tier 4 · Advanced
   Maturing — official staff, financial infrastructure in place

🟠 Tier 5 · Advanced
   Fully realized — BTC as unit of account, complete circular economy

TO SET YOUR TIER:
1. Economy Admin Dashboard
2. Scroll to 'FBCE Classification' section
3. Select your tier from the dropdown
4. Click Save

Framework by FBCE (fbce.io) — the global standard for Bitcoin circular economies.`,
  },
  {
    keywords: ['logo', 'banner', 'image', 'photo', 'upload', 'branding'],
    specificity: 2,
    response: `To add your economy's logo and banner:

1. Go to Economy Admin Dashboard
2. Find 'Branding' section at the top
3. Upload your banner image (1200x300px rec.)
   → Appears as hero behind your economy name
4. Upload your logo (400x400px rec.)
   → Appears as circular avatar

FILE REQUIREMENTS:
→ Logo: max 2MB, JPG/PNG/SVG/WebP
→ Banner: max 5MB, JPG/PNG/WebP
→ Drag and drop or click to upload

Your logo also appears on:
→ The global leaderboard rows
→ Economy cards on the homepage
→ Your public economy dashboard

Tip: Use a real photo of your community as the banner — it builds instant trust with visitors and funders.`,
  },
  {
    keywords: ['map', 'location', 'pins', 'geography', 'where'],
    specificity: 2,
    response: `The Merchant Map on your economy dashboard shows all your Bitcoin-accepting merchants as pins on a map.

ORANGE PINS = BTCMap verified merchants
BLUE PINS = Self-reported merchants

The map auto-centers on your merchants when they load.

If your map is empty:
→ Sync your BTCMap community ID first
→ Or submit merchants manually via the Quick Submit form

There's also a Global Economies Map on the homepage showing all registered economies worldwide as pins.

Click any pin to see economy stats preview.`,
  },
  {
    keywords: ['leaderboard', 'ranking', 'top', 'compare', 'competition'],
    specificity: 2,
    response: `The Leaderboard ranks all Bitcoin circular economies by activity.

DEFAULT SORT: Monthly transactions (higher = more active economy)

ALSO SORT BY:
→ Activity Rate (% of active days)
→ Circularity Score
→ Merchant count

FILTERS AVAILABLE:
→ Region (Africa, Latin America, Europe, Asia)
→ Country and City
→ FBCE Tier (Emerging / Advanced)
→ Activity status
→ Merchant coverage
→ BTCMap verified only

COMPARE TOOL (/compare):
→ Select any 2 economies
→ Side-by-side score comparison
→ Pillar breakdown chart
→ Auto-generated strengths and gaps
→ Share comparison link

Your economy appears on the leaderboard once it has at least some approved data.`,
  },
  {
    keywords: ['proof', 'evidence', 'receipt', 'video'],
    specificity: 3,
    response: `Proof of Circularity lets anyone submit evidence of real Bitcoin transactions.

WHAT YOU CAN SUBMIT:
→ Photos of merchants accepting Bitcoin
→ Screenshots of Lightning payments
→ Receipts showing BTC transactions
→ Videos of real economic activity

HOW TO SUBMIT:
1. Go to your economy's public page (/c/slug)
2. Click 'Proof of Circularity'
3. Upload your photo/video/receipt
4. Add merchant name and amount (optional)
5. Validators review and approve it

WHY IT MATTERS:
→ Builds public trust in your economy
→ Shows funders real adoption evidence
→ Approved proofs display publicly
→ Counts toward your confidence score

This is one of the most powerful features for showing Blink or HRF that your economy is real and active.`,
  },
  {
    keywords: ['qr', 'quick submit', 'mobile submit', 'merchant submit'],
    specificity: 4,
    response: `Quick Submit lets anyone add a merchant in under 30 seconds from their phone.

HOW IT WORKS:
1. Economy admin downloads QR code from Economy Admin Dashboard
2. Print and display at merchant locations
3. Customer scans QR code
4. Opens /quick-submit on their phone
5. Choose: Merchant / Earner / Transaction
6. Fill 3 fields maximum
7. Submit → goes to validator queue

The QR is pre-linked to your specific economy so submitters don't need to search for it.

Great for:
→ Bitcoin meetups and events
→ Market days
→ Merchant onboarding visits
→ Community outreach sessions`,
  },
  {
    keywords: ['admin', 'dashboard', 'manage', 'settings', 'control'],
    specificity: 2,
    response: `Your Economy Admin Dashboard is at:
/dashboard/economy/[your-economy-id]

FROM THERE YOU CAN:
→ Edit economy name, description, location
→ Upload logo and banner image
→ Set BTCMap community ID and sync merchants
→ Connect Blink wallet API key
→ Appoint and manage validators
→ Set your FBCE tier classification
→ View your circularity score breakdown
→ Download your Quick Submit QR code
→ See pending submissions
→ Recalculate your score on demand

Super Admin Dashboard (/admin):
→ Available only to platform super admins
→ Approve/reject economy registrations
→ Manage all economies and users
→ Recalculate all scores globally
→ Resync all BTCMap data`,
  },
  {
    keywords: ['fund', 'grant', 'hrf', 'money', 'support', 'merch'],
    specificity: 3,
    response: `There are two ways to get funding support through Circular:

1. COMMUNITY MERCH (via Blink Store)
→ Every economy page has a 'Shop Community Merch ⚡' button
→ Links to blinkstuff.com
→ Communities sell branded Bitcoin merch
→ Customers pay via Lightning
→ Sats earned count as circular activity

2. GRANT FUNDING
→ Your Circular dashboard is proof of impact
→ Real data makes grant applications stronger
→ HRF Bitcoin Development Fund funds circular economy infrastructure
→ Your circularity score, merchant count and transaction data are your evidence

The stronger your data on Circular, the stronger your grant application.

Contact the Circular team for help preparing a grant application.`,
  },
  {
    keywords: ['privacy', 'data', 'wallet address', 'anonymous', 'secure', 'safe'],
    specificity: 3,
    response: `Circular is privacy-first by design:

WHAT WE NEVER STORE:
→ Wallet addresses
→ Payment hashes
→ Private keys
→ Individual transaction details
→ Personal financial data

WHAT WE DO STORE:
→ Aggregate transaction counts
→ Merchant locations and categories
→ Anonymous earner role descriptions
→ Economy-level statistics only

BLINK INTEGRATION:
→ Read-only API keys only
→ We see aggregate counts, not individual txns
→ No custody of any funds. Ever.

All transaction data is anonymous and self-reported. Circular tracks economic activity at the community level — not individual financial behavior.

Your economy's data is public by design — transparency is what makes the platform credible to funders and partners.`,
  },
  {
    keywords: ['help', 'problem', 'issue', 'error', 'broken', 'contact', 'support', 'stuck'],
    specificity: 1,
    response: `I'm here to help! For common issues:

SCORE NOT UPDATING?
→ Go to Economy Admin Dashboard
→ Click 'Recalculate score' button
→ Or wait for weekly auto-update

BTCMAP NOT SYNCING?
→ Check your community ID is correct
→ Use just the ID, not the full URL
→ Make sure your bounding box covers your area

UPLOAD NOT WORKING?
→ Check file size (logo: 2MB, banner: 5MB)
→ Use JPG, PNG, or WebP format

ECONOMY NOT SHOWING ON LEADERBOARD?
→ Your economy may still be pending approval
→ Check your email for approval notification

FOR URGENT ISSUES:
Contact the Circular team directly:
📧 smartdestinyonyekachi@gmail.com

Describe your issue clearly and we'll respond within 24 hours.`,
  },
];

const DEFAULT_RESPONSE = `I can help you with:

⚡ Registering your circular economy
📍 Syncing merchants from BTCMap
📊 Understanding your circularity score
✅ Setting up validators
💳 Connecting your Blink wallet
🏆 FBCE tier classification
🗺️ Merchant maps and locations
📸 Submitting proof of circularity
🏅 Leaderboard and rankings

Just ask about any of these topics, or contact us at:
smartdestinyonyekachi@gmail.com`;

interface Topic {
  label: string;
  question: string;
  ruleIndex: number;
}

const TOPICS: Topic[] = [
  { label: 'Register an economy', question: 'How do I register my economy?', ruleIndex: 0 },
  { label: 'Sync BTCMap merchants', question: 'How do I sync BTCMap?', ruleIndex: 1 },
  { label: 'Circularity score', question: 'What is the circularity score?', ruleIndex: 2 },
  { label: 'Appoint validators', question: 'How do I appoint validators?', ruleIndex: 3 },
  { label: 'Connect Blink wallet', question: 'How do I connect my Blink wallet?', ruleIndex: 4 },
  { label: 'FBCE tier classification', question: 'What is FBCE tier?', ruleIndex: 5 },
  { label: 'Logo & banner upload', question: 'How do I upload a logo and banner?', ruleIndex: 6 },
  { label: 'Merchant map', question: 'How does the merchant map work?', ruleIndex: 7 },
  { label: 'Leaderboard & compare', question: 'How does the leaderboard work?', ruleIndex: 8 },
  { label: 'Proof of Circularity', question: 'How do I submit proof of circularity?', ruleIndex: 9 },
  { label: 'Quick Submit QR', question: 'How does Quick Submit work?', ruleIndex: 10 },
  { label: 'Admin dashboard', question: 'How do I use the admin dashboard?', ruleIndex: 11 },
  { label: 'Funding & grants', question: 'How can I get funding or grants?', ruleIndex: 12 },
  { label: 'Privacy & data', question: 'How does Circular handle privacy?', ruleIndex: 13 },
  { label: 'Troubleshooting', question: 'I have a problem — how do I get help?', ruleIndex: 14 },
];

function findResponse(input: string): string {
  const text = input.toLowerCase();
  let best: { rule: Rule; score: number } | null = null;
  for (const rule of RULES) {
    let matches = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) matches++;
    }
    if (matches > 0) {
      const score = matches * 10 + rule.specificity;
      if (!best || score > best.score) best = { rule, score };
    }
  }
  return best ? best.rule.response : DEFAULT_RESPONSE;
}

export default function CircularAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING },
  ]);
  const [input, setInput] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [topicOpen, setTopicOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topicWrapRef = useRef<HTMLDivElement>(null);
  const hasUserMsg = messages.some(m => m.role === 'user');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // Lock body scroll on mobile when chat is open (full-screen takeover)
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(max-width: 639px)');
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (topicWrapRef.current && !topicWrapRef.current.contains(e.target as Node)) {
        setTopicOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const send = (text: string, presetReply?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = presetReply ?? findResponse(trimmed);
    setMessages(m => [...m, { role: 'user', content: trimmed }, { role: 'assistant', content: reply }]);
    setInput('');
  };

  const pickTopic = (t: Topic) => {
    send(t.question, RULES[t.ruleIndex]?.response);
    setTopicQuery('');
    setTopicOpen(false);
  };

  const filteredTopics = topicQuery.trim()
    ? TOPICS.filter(t => {
        const q = topicQuery.toLowerCase();
        return (
          t.label.toLowerCase().includes(q) ||
          t.question.toLowerCase().includes(q) ||
          RULES[t.ruleIndex]?.keywords.some(k => k.toLowerCase().includes(q))
        );
      })
    : TOPICS;

  return (
    <>
      {/* Collapsed pill */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-score-amber px-5 py-3 text-sm font-semibold text-background shadow-lg shadow-score-amber/30 hover:shadow-score-amber/50 hover:-translate-y-0.5 transition-all"
            aria-label="Open Circular Assistant"
          >
            <Zap className="h-4 w-4" fill="currentColor" />
            Ask Circular AI
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ height: '100dvh' }}
            className="fixed z-50 bg-card flex flex-col
                       inset-0 w-full
                       sm:!h-[480px] sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[360px]
                       sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
          >
            {/* Header — sticky on mobile */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-card"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-score-amber/15 border border-score-amber/30 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-score-amber" fill="currentColor" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-foreground">Circular Assistant</div>
                  <div className="text-[11px] text-muted-foreground">Ask me anything</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-1 rounded-md hover:bg-muted"
                aria-label="Close assistant"
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            </div>

            {/* Topic search dropdown — sticky on mobile */}
            <div ref={topicWrapRef} className="sticky top-[57px] sm:top-auto z-10 relative px-3 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  value={topicQuery}
                  onChange={e => {
                    setTopicQuery(e.target.value);
                    setTopicOpen(true);
                  }}
                  onFocus={() => setTopicOpen(true)}
                  placeholder="Jump to a topic…"
                  className="w-full bg-card border border-border rounded-lg pl-8 pr-8 py-2 text-base sm:text-xs sm:py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-score-amber"
                />
                <button
                  type="button"
                  onClick={() => setTopicOpen(o => !o)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle topics"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${topicOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {topicOpen && (
                <div className="absolute left-3 right-3 top-full mt-1 z-10 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                  {filteredTopics.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No topics match.</div>
                  ) : (
                    filteredTopics.map(t => (
                      <button
                        key={t.label}
                        onClick={() => pickTopic(t)}
                        className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted hover:text-score-amber transition-colors border-b border-border last:border-b-0"
                      >
                        {t.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                      m.role === 'user'
                        ? 'bg-score-amber text-background rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {!hasUserMsg && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_REPLIES.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border border-border bg-background hover:border-score-amber hover:text-score-amber transition-colors text-muted-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input — sticky bottom with safe-area padding */}
            <form
              onSubmit={e => {
                e.preventDefault();
                send(input);
              }}
              className="sticky bottom-0 border-t border-border p-3 flex items-center gap-2 bg-card"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-score-amber"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg bg-score-amber text-background disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                aria-label="Send"
              >
                <Send className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
