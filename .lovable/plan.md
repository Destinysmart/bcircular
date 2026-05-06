## Gate `/data` behind sign-in

Match the pattern used on `/leaderboard` and `/compare`: logged-out visitors see the `AuthGate` card instead of the full Open Data page.

### Change

In `src/pages/PublicData.tsx`:

1. Import `AuthGate` and `useAuth`.
2. At the top of the `PublicData` component, before any data is rendered, add:
   ```tsx
   const { user, loading: authLoading } = useAuth();
   if (!authLoading && !user) {
     return (
       <AuthGate
         title="Unlock open Bitcoin economy data"
         message="Sign up free to access the dataset, CSV downloads, preview table, and request research or partner access."
       />
     );
   }
   ```

That's it — no route or backend changes. Logged-in users continue to see the full page exactly as today; logged-out visitors see the same gated card pattern as the leaderboard.
