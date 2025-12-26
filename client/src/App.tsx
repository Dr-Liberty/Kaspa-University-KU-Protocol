import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/lib/wallet-context";
import { Header } from "@/components/header";
import { BlockDAGBackground } from "@/components/blockdag-background";
import Landing from "@/pages/landing";
import Courses from "@/pages/courses";
import CourseDetail from "@/pages/course-detail";
import Dashboard from "@/pages/dashboard";
import Certificates from "@/pages/certificates";
import Analytics from "@/pages/analytics";
import VerifyPage from "@/pages/verify";
import VerifyExplorerPage from "@/pages/verify-explorer";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/certificates" component={Certificates} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/verify" component={VerifyExplorerPage} />
      <Route path="/verify/:txHash" component={VerifyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <div className="min-h-screen text-foreground">
            <BlockDAGBackground />
            <Header />
            <Router />
          </div>
          <Toaster />
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
