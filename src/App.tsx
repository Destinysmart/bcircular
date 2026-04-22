import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Homepage from "./pages/Homepage";
import Home from "./pages/Home";
import RootRedirect from "./components/RootRedirect";
import Leaderboard from "./pages/Leaderboard";
import CommunityDashboard from "./pages/CommunityDashboard";
import SubmitPage from "./pages/SubmitPage";
import Widget from "./pages/Widget";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/c/:slug" element={<CommunityDashboard />} />
            <Route path="/c/:slug/submit" element={<SubmitPage />} />
            <Route path="/c/:slug/report" element={<ProofOfCircularity />} />
            <Route path="/c/:slug/proofs" element={<Proofs />} />
            <Route path="/widget/:slug" element={<Widget />} />
            <Route path="/quick-submit" element={<QuickSubmit />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/register" element={<RegisterCommunity />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/validate" element={<ValidatorDashboard />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/dashboard/economy/:id" element={<EconomyAdminDashboard />} />
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
