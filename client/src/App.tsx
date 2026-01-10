import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SearchDialog } from "@/components/search-dialog";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import DevelopersPage from "@/pages/developers";
import DeveloperDetailPage from "@/pages/developer-detail";
import BanksPage from "@/pages/banks";
import BankDetailPage from "@/pages/bank-detail";
import MapPage from "@/pages/map-page";
import FavoritesPage from "@/pages/favorites";
import AccountPage from "@/pages/account";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/developers" component={DevelopersPage} />
      <Route path="/developers/:id" component={DeveloperDetailPage} />
      <Route path="/banks" component={BanksPage} />
      <Route path="/banks/:id" component={BankDetailPage} />
      <Route path="/map" component={MapPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/secret_admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "64px",
  } as React.CSSProperties;

  // Глобальный обработчик клавиш для Alt+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle}>
            <div className="flex h-screen w-full">
              <AppSidebar onSearchClick={() => setSearchOpen(true)} />
              <SidebarInset className="flex flex-col flex-1">
                <Header />
                <main className="flex-1 overflow-hidden">
                  <Router />
                </main>
              </SidebarInset>
            </div>
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
