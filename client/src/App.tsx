import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LearningPage from "@/pages/LearningPage";
import { ThemeProvider } from "next-themes";
import { MatrixBackground } from "@/components/ui/MatrixBackground";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

// Router component
function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/learning" component={LearningPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
      >
        <TooltipProvider>
          <MatrixBackground />
          <Toaster />
          <FeedbackButton />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
