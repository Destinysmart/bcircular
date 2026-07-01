import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Homepage from "./pages/Homepage";
import Home from "./pages/Home";
import RootRedirect from "./components/RootRedirect";
import Leaderboard from "./pages/Leaderboard";
import CommunityDashboard from "./pages/CommunityDashboard";
import SubmitPage from "./pages/SubmitPage";
import Widget from "./pages/Widget";
import WidgetTest from "./pages/WidgetTest";
import RegisterCommunity from "./pages/RegisterCommunity";
import Login from "./pages/Login";
import ValidatorDashboard from "./pages/ValidatorDashboard";
import Methodology from "./pages/Methodology";
import EconomyAdminDashboard from "./pages/EconomyAdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ProofOfCircularity from "./pages/ProofOfCircularity";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Proofs from "./pages/Proofs";
import QuickSubmit from "./pages/QuickSubmit";
import Compare from "./pages/Compare";
import MerchantClaim from "./pages/MerchantClaim";
import MerchantDashboard from "./pages/MerchantDashboard";
import ConnectWallet from "./pages/ConnectWallet";
import WalletDashboard from "./pages/WalletDashboard";
import JoinAsEarner from "./pages/JoinAsEarner";
import PublicData from "./pages/PublicData";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import MyDashboardRedirect from "./pages/MyDashboardRedirect";
import Onboarding from "./pages/Onboarding";
import CircularAssistant from "./components/CircularAssistant";
import InstallAppPrompt from "./components/InstallAppPrompt";

const queryClient = new QueryClient();

function AssistantGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/widget/') || pathname === '/widget') return null;
  return (
    <>
      <CircularAssistant />
      <InstallAppPrompt />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <main id="main" role="main">
              <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/c/:slug" element={<CommunityDashboard />} />
              <Route path="/c/:slug/submit" element={<SubmitPage />} />
              <Route path="/c/:slug/join-as-earner" element={<JoinAsEarner />} />
              <Route path="/c/:slug/report" element={<ProofOfCircularity />} />
              <Route path="/c/:slug/proof" element={<ProofOfCircularity />} />
              <Route path="/c/:slug/proofs" element={<Proofs />} />
              <Route path="/data" element={<PublicData />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/widget/:slug" element={<Widget />} />
              <Route path="/widget-test" element={<WidgetTest />} />
              <Route path="/quick-submit" element={<QuickSubmit />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/register" element={<RegisterCommunity />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/validate" element={<ValidatorDashboard />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/dashboard" element={<MyDashboardRedirect />} />
              <Route path="/dashboard/economy/:id" element={<EconomyAdminDashboard />} />
              <Route path="/admin" element={<SuperAdminDashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/merchant/claim/:publicId" element={<MerchantClaim />} />
              <Route path="/m/:publicId" element={<MerchantDashboard />} />
              {/* Unified privacy-first connect flow — the code IS the auth */}
              <Route path="/connect" element={<ConnectWallet />} />
              <Route path="/connect/dashboard" element={<WalletDashboard />} />
              {/* Legacy fixed-type routes still work for any links already in the wild */}
              <Route path="/merchant/connect" element={<ConnectWallet ownerType="merchant" />} />
              <Route path="/merchant/dashboard" element={<WalletDashboard ownerType="merchant" />} />
              <Route path="/earner/connect" element={<ConnectWallet ownerType="earner" />} />
              <Route path="/earner/dashboard" element={<WalletDashboard ownerType="earner" />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <AssistantGate />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
