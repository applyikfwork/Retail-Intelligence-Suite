import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Campaigns from "@/pages/campaigns";
import Sales from "@/pages/sales";
import Loyalty from "@/pages/loyalty";
import Footfall from "@/pages/footfall";
import Social from "@/pages/social";
import Appointments from "@/pages/appointments";
import Invoices from "@/pages/invoices";
import WinBack from "@/pages/win-back";
import Chat from "@/pages/chat";
import Forecast from "@/pages/forecast";
import Staff from "@/pages/staff";
import Expenses from "@/pages/expenses";
import Inventory from "@/pages/inventory";
import Reviews from "@/pages/reviews";
import Referrals from "@/pages/referrals";
import TryOn from "@/pages/tryon";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/sales" component={Sales} />
        <Route path="/loyalty" component={Loyalty} />
        <Route path="/footfall" component={Footfall} />
        <Route path="/social" component={Social} />
        <Route path="/appointments" component={Appointments} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/win-back" component={WinBack} />
        <Route path="/chat" component={Chat} />
        <Route path="/forecast" component={Forecast} />
        <Route path="/staff" component={Staff} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/tryon" component={TryOn} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
