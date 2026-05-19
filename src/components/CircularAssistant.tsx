import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ArrowUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const getOpeningMessage = (userName: string | undefined, economyName: string | undefined, path: string): string => {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Morning' : h < 17 ? 'Hey' : 'Evening';
  if (userName && economyName) {
    return `${greeting} ${userName}! I'm Sats, your Bitcoin Circular guide. I'm here to help with ${economyName}. What are you working on today?`;
  }
  if (path.startsWith('/c/')) {
    return `Hey! I'm Sats, Bitcoin Circular's guide. Looking at this economy's profile — anything you want to understand or improve?`;
  }
  if (path === '/register') {
    return `Hey! I'm Sats, your Bitcoin Circular guide. Looks like you're registering a Bitcoin circular economy. I can walk you through the whole process — what's the name of your community?`;
  }
  if (path === '/leaderboard') {
    return `Hey! I'm Sats. Checking out the leaderboard? I can explain what the metrics mean or help you understand how any economy got their score.`;
  }
  return `Hey! I'm Sats, Bitcoin Circular's guide. I help communities track and grow their Bitcoin circular economy. Are you setting up a new economy or working on an existing one?`;
};

export default function CircularAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const userName: string | undefined =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.display_name as string) ||
    (user?.email ? user.email.split('@')[0] : undefined);

  const [economy, setEconomy] = useState<{ name: string; latest_score: number | null } | null>(null);

  // Fetch current economy if on a community page
  useEffect(() => {
    const m = location.pathname.match(/^\/c\/([^/]+)/);
    if (!m) {
      setEconomy(null);
      return;
    }
    const slug = m[1];
    let cancel = false;
    (async () => {
      const { data: comm } = await supabase
        .from('communities')
        .select('id, name')
        .eq('slug', slug)
        .maybeSingle();
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set / refresh opening message based on context
  useEffect(() => {
    setMessages([{ role: 'assistant', content: getOpeningMessage(userName, economy?.name, location.pathname) }]);
  }, [userName, economy?.name, location.pathname]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, isThinking]);

  useEffect(() => {
    if (!open) return;
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
      const apiMessages = next.filter(m => m.role === 'user' || m.role === 'assistant').slice(1); // drop opening assistant msg
      // Anthropic requires the conversation to start with a user message — slicing(1) handles that.
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
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

      if (error) throw error;
      const reply: string = data?.reply || data?.error || "Hmm, I hit a snag. Try again in a sec — or email smartdestinyonyekachi@gmail.com if it persists.";
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
      setMessages(m => [...m, { role: 'assistant', content: "Hmm, I hit a snag connecting just now. Try again in a sec — or email smartdestinyonyekachi@gmail.com if it persists." }]);
    } finally {
      setIsThinking(false);
    }
  };

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
            <div
              className="pointer-events-none absolute right-0 bottom-full mb-2 px-2.5 py-1.5 rounded-md
                         bg-popover text-popover-foreground text-xs font-medium border border-border shadow-md
                         whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                         transition-all duration-150"
            >
              Ask Sats
            </div>
            <button
              onClick={() => { setOpen(true); setHasOpenedOnce(true); }}
              className={`relative h-12 w-12 rounded-full bg-score-amber text-background
                         flex items-center justify-center shadow-lg shadow-score-amber/40
                         hover:shadow-score-amber/60 hover:-translate-y-0.5 transition-all
                         ${!hasOpenedOnce ? 'circular-assistant-pulse' : ''}`}
              aria-label="Open Sats"
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
                       sm:!h-[min(560px,calc(100dvh-96px))] sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px]
                       sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
          >
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-card"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-score-amber/15 border border-score-amber/30 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-score-amber" fill="currentColor" />
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground inline-flex items-center gap-1">Sats <Zap className="h-3.5 w-3.5 text-score-amber" fill="currentColor" /></span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-score-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-score-green" />
                      Online
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Bitcoin Circular guide</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-1 rounded-md hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap leading-relaxed rounded-2xl px-3.5 py-2.5 text-[14px] ${
                      m.role === 'user'
                        ? 'bg-score-amber text-background rounded-br-sm'
                        : 'text-foreground'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start">
                  <div className="text-foreground/70 px-1 py-1 inline-flex items-center gap-2 text-[13px]">
                    <span>Sats is thinking</span>
                    <span className="inline-flex items-center gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="sticky bottom-0 border-t border-border p-3 flex items-center gap-2 bg-card"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Sats anything..."
                disabled={isThinking}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-score-amber disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg bg-score-amber text-background disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                aria-label="Send"
              >
                <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={2.5} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
