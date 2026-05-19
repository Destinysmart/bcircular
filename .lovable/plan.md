## Goal
Restore Claude as the primary brain for **Ask Sats**, with Gemini (via Lovable AI Gateway) as an automatic fallback if Anthropic errors, rate-limits, or runs out of credits.

## Changes

### `supabase/functions/ai-assistant/index.ts`
- Add a `callClaude()` path using `ANTHROPIC_API_KEY` + `claude-3-5-sonnet-20241022` (Anthropic Messages API, with the existing tool definitions converted to Anthropic's `tools` schema).
- Keep the existing `callGemini()` path (Lovable AI Gateway, `google/gemini-2.5-flash`) as fallback.
- Wrap the call in try/catch with explicit fallback triggers:
  - Anthropic returns 429, 5xx, 401 → fall back to Gemini
  - Anthropic network/timeout error → fall back to Gemini
  - Tool-call loop still works on either backend (shared tool executors: `search_economies`, `get_top_economies`, `get_economy_details`, `escalate_to_human`)
- Add a response header `x-ask-sats-brain: claude | gemini` so we can confirm which model answered (visible in network tab, useful for debugging).
- Log fallback events to `console.warn` so they surface in edge function logs.

### No frontend changes
`CircularAssistant.tsx` stays as-is — it just consumes the streamed response.

### No secret changes
`ANTHROPIC_API_KEY` and `LOVABLE_API_KEY` are both already present. Nothing to add or remove.

## Verification
1. Deploy the function.
2. Send a test message from Ask Sats → confirm `x-ask-sats-brain: claude` in network response.
3. Check edge function logs for the Anthropic call.
4. (Optional) Temporarily break the Anthropic key locally to confirm Gemini fallback kicks in.

## Out of scope
- No model upgrade beyond `claude-3-5-sonnet-20241022` (can switch to Opus or 3.7 later if you want).
- No UI changes to the chat panel.
- No changes to the SEO/PWA/install-prompt work from earlier turns.
