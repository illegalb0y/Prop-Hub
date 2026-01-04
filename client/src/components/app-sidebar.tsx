import { Building2, Landmark, MapPin, Settings, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AppSidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function AppSidebar({ searchQuery, onSearchChange }: AppSidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { title: t("nav.home"), url: "/", icon: Home },
    { title: t("nav.projects"), url: "/projects", icon: MapPin },
    { title: t("nav.developers"), url: "/developers", icon: Building2 },
    { title: t("nav.banks"), url: "/banks", icon: Landmark },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link
          href="/"
          className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span
            className="font-heading text-xl font-bold group-data-[collapsible=icon]:hidden"
            data-testid="text-logo"
          >
            PropertyHub
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="text-[18px]">
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent className="px-2 pt-0 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("header.searchPlaceholder")}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-testid="input-sidebar-search"
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link
                        href={item.url}
                        data-testid={`link-nav-${item.url.slice(1) || "home"}`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarSeparator className="mb-2" />
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-4">
          <SidebarMenuButton
            asChild
            tooltip={t("nav.settings")}
            className="group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
          >
            <Link href="/settings" data-testid="link-settings">
              <Settings className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                {t("nav.settings")}
              </span>
            </Link>
          </SidebarMenuButton>
          <div className="group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
