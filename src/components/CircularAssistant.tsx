import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ArrowUp, Mail, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUPPORT_EMAIL = 'smartdestinyonyekachi@gmail.com';

const getOpening = (userName: string | undefined, economyName: string | undefined, path: string): string => {
  const h = new Date().getHours();
  const g = h < 12 ? 'Morning' : h < 17 ? 'Hey' : 'Evening';
  if (userName && economyName) return `${g} **${userName}** ⚡ I'm Sats — your support agent for Bitcoin Circular. Working on **${economyName}** today? Tell me what's up.`;
  if (path.startsWith('/c/')) return `Hey — I'm **Sats**, customer support for Bitcoin Circular. Looking at this economy's profile? I can explain its score, fix sync issues, or point you to the right next step.`;
  if (path === '/register') return `Hey — I'm **Sats**. Registering a new economy? I'll walk you through it. What's the community name?`;
  if (path === '/leaderboard') return `Hey — I'm **Sats**. Browsing the leaderboard? Ask me about any economy, the score formula, or how to climb.`;
  if (path === '/validate') return `Hey — I'm **Sats**. Validator questions? Submission stuck? Ask away.`;
  return `Hi — I'm **Sats**, Bitcoin Circular's AI support agent. I can answer platform questions, debug issues, look up any economy live, or hand you off to a human. What do you need?`;
};

const getQuickReplies = (path: string): string[] => {
  if (path === '/leaderboard') return ['Top 5 economies right now', 'How is the score calculated?', "Why is my economy's score low?"];
  if (path === '/register') return ['What do I need to register?', 'How long does approval take?', 'Talk to a human'];
  if (path.startsWith('/c/')) return ['Explain this score', 'How do I recalculate?', 'Connect a Blink wallet'];
  if (path === '/validate') return ['How does validation work?', 'My dashboard is empty', 'Talk to a human'];
  return ['How do I register an economy?', 'What is a circular economy?', 'Show me top economies', 'Report a bug'];
};

// Render assistant markdown but make links / mailtos clickable safely
const Markdown = ({ text }: { text: string }) => (
  <div className="prose prose-sm prose-invert max-w-none
    prose-p:my-1.5 prose-p:leading-relaxed
    prose-a:text-score-amber prose-a:underline-offset-2 hover:prose-a:underline
    prose-strong:text-foreground prose-strong:font-semibold
    prose-code:text-score-amber prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none
    prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0
    text-[14px] text-foreground">
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
);

export default function CircularAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const userName: string | undefined =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.display_name as string) ||
    (user?.email ? user.email.split('@')[0] : undefined);

  const [economy, setEconomy] = useState<{ name: string; latest_score: number | null } | null>(null);

  useEffect(() => {
    const m = location.pathname.match(/^\/c\/([^/]+)/);
    if (!m) { setEconomy(null); return; }
    const slug = m[1];
    let cancel = false;
    (async () => {
      const { data: comm } = await supabase.from('communities').select('id, name').eq('slug', slug).maybeSingle();
      if (cancel || !comm) return;
      const { data: score } = await supabase
        .from('circularity_scores')
        .select('score')
        .eq('community_id', comm.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancel) setEconomy({ name: comm.name, latest_score: score?.score ?? null });
    })();
    return () => { cancel = true; };
  }, [location.pathname]);

  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickReplies = useMemo(() => getQuickReplies(location.pathname), [location.pathname]);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: getOpening(userName, economy?.name, location.pathname) }]);
  }, [userName, economy?.name, location.pathname]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, isThinking]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const mq = window.matchMedia('(max-width: 639px)');
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setIsThinking(true);
    const startedAt = Date.now();

    try {
      const apiMessages = next.filter(m => m.role === 'user' || m.role === 'assistant').slice(1);
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: apiMessages,
          context: location.pathname,
          user_name: userName,
          economy_name: economy?.name,
          economy_score: economy?.latest_score,
        },
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

      if (error) throw error;
      const reply: string = data?.reply || data?.error || `Hmm, I hit a snag. Try again in a sec — or email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) if it persists.`;
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: `Hmm, I hit a snag connecting just now. Try again in a sec — or email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) if it persists.` }]);
    } finally {
      setIsThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const resetChat = () => {
    setMessages([{ role: 'assistant', content: getOpening(userName, economy?.name, location.pathname) }]);
  };

  const copyMessage = async (text: string, idx: number) => {
    try { await navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); } catch { /* ignore */ }
  };

  const supportSubject = encodeURIComponent('[Bitcoin Circular Support] Need help');

  // Show quick replies only when only the opening assistant message is there
  const showQuickReplies = messages.length === 1 && !isThinking;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{ zIndex: 999 }}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 group"
          >
            <div className="pointer-events-none absolute right-0 bottom-full mb-2 px-2.5 py-1.5 rounded-md
                         bg-popover text-popover-foreground text-xs font-medium border border-border shadow-md
                         whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                         transition-all duration-150">
              Ask Sats · Support
            </div>
            <button
              onClick={() => { setOpen(true); setHasOpenedOnce(true); }}
              className={`relative h-12 w-12 rounded-full bg-score-amber text-background
                         flex items-center justify-center shadow-lg shadow-score-amber/40
                         hover:shadow-score-amber/60 hover:-translate-y-0.5 transition-all
                         ${!hasOpenedOnce ? 'circular-assistant-pulse' : ''}`}
              aria-label="Open Sats support"
            >
              <Zap className="h-5 w-5" fill="currentColor" />
              {!hasOpenedOnce && (
                <span aria-hidden className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ height: '100dvh', zIndex: 999 }}
            className="fixed bg-card flex flex-col
                       inset-0 w-full
                       sm:!h-[min(620px,calc(100dvh-96px))] sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px]
                       sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl overflow-hidden"
          >
            {/* Gradient header */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border
                         bg-gradient-to-br from-score-amber/15 via-card to-card"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-xl bg-score-amber/20 border border-score-amber/40 flex items-center justify-center">
                    <Zap className="h-4.5 w-4.5 text-score-amber" fill="currentColor" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-score-green ring-2 ring-card" />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">Sats</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-score-amber/15 text-score-amber inline-flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> AI Support
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Usually replies instantly · Powered by Bitcoin Circular</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={resetChat}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
                  aria-label="Start a new chat"
                  title="New chat"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${supportSubject}`}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
                  aria-label="Email human support"
                  title="Email a human"
                >
                  <Mail className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-1 rounded-md hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-card">
              {messages.map((m, i) => (
                <div key={i} className={`group/msg flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'user' ? (
                    <div className="max-w-[85%] whitespace-pre-wrap leading-relaxed rounded-2xl rounded-br-md px-3.5 py-2.5 text-[14px] bg-score-amber text-background shadow-sm">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[88%] flex gap-2 items-start">
                      <div className="h-6 w-6 shrink-0 rounded-md bg-score-amber/15 border border-score-amber/30 flex items-center justify-center mt-0.5">
                        <Zap className="h-3 w-3 text-score-amber" fill="currentColor" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Markdown text={m.content} />
                        {i > 0 && (
                          <button
                            onClick={() => copyMessage(m.content, i)}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover/msg:opacity-100 transition-opacity"
                          >
                            {copiedIdx === i ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center">
                    <div className="h-6 w-6 rounded-md bg-score-amber/15 border border-score-amber/30 flex items-center justify-center">
                      <Zap className="h-3 w-3 text-score-amber" fill="currentColor" />
                    </div>
                    <div className="text-foreground/70 inline-flex items-center gap-2 text-[13px]">
                      <span>Sats is thinking</span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showQuickReplies && (
                <div className="pt-2 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">Quick questions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReplies.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="text-[12px] px-2.5 py-1.5 rounded-full border border-border text-foreground hover:bg-score-amber/10 hover:border-score-amber/50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="sticky bottom-0 border-t border-border p-3 bg-card"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask Sats anything — or describe your issue..."
                  rows={1}
                  disabled={isThinking}
                  className="flex-1 resize-none bg-background border border-border rounded-xl px-3 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-score-amber disabled:opacity-60 max-h-32"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className="h-11 w-11 sm:h-10 sm:w-10 inline-flex items-center justify-center rounded-xl bg-score-amber text-background disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                  aria-label="Send"
                >
                  <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={2.5} />
                </button>
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground px-1 flex items-center justify-between">
                <span>Sats can look up live data. AI may make mistakes.</span>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=${supportSubject}`} className="text-muted-foreground hover:text-score-amber transition-colors">
                  Human support →
                </a>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
