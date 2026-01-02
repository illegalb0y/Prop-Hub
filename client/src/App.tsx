import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
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
import AdminPage from "@/pages/admin";

function Router({ searchQuery }: { searchQuery: string }) {
  return (
    <Switch>
      <Route path="/" component={() => <HomePage searchQuery={searchQuery} />} />
      <Route path="/projects" component={() => <ProjectsPage searchQuery={searchQuery} />} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/developers" component={() => <DevelopersPage searchQuery={searchQuery} />} />
      <Route path="/developers/:id" component={DeveloperDetailPage} />
      <Route path="/banks" component={() => <BanksPage searchQuery={searchQuery} />} />
      <Route path="/banks/:id" component={BankDetailPage} />
      <Route path="/map" component={() => <MapPage searchQuery={searchQuery} />} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/secret_admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");

  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "64px",
  } as React.CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle}>
            <div className="flex h-screen w-full">
              <AppSidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              <SidebarInset className="flex flex-col flex-1">
                <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                <main className="flex-1 overflow-hidden">
                  <Router searchQuery={searchQuery} />
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
