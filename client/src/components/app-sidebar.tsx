import { Building2, Landmark, MapPin, Settings, Home, LogOut, LogIn, Moon, Sun, Calculator } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/lib/theme-provider";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppSidebarProps {
  onSearchClick: () => void;
}

export function AppSidebar({ onSearchClick }: AppSidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const handleSearchClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    onSearchClick();
  };

  const navItems = [
    { title: t("nav.home"), url: "/", icon: Home },
    { title: t("nav.projects"), url: "/projects", icon: MapPin },
    { title: t("nav.developers"), url: "/developers", icon: Building2 },
    { title: t("nav.banks"), url: "/banks", icon: Landmark },
    { title: t("nav.mortgageCalculator"), url: "/mortgage-calculator", icon: Calculator },
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSearchClick}
                  tooltip={t("search.tooltip")}
                  className="w-full justify-start text-base"
                  data-testid="button-sidebar-search"
                >
                  <Search className="h-5 w-5 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden flex items-center gap-2 flex-1">
                    <span>{t("search.button")}</span>
                    {!isMobile && (
                      <span className="ml-auto text-xs text-muted-foreground">{t("search.altK")}</span>
                    )}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

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
                      className="text-base"
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.settings")} className="text-base">
              <Link href="/settings" data-testid="link-settings">
                <Settings className="h-5 w-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {t("nav.settings")}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={theme === "light" ? t("theme.switchToDark") : t("theme.switchToLight")}
              className="text-base"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5 shrink-0" />
              ) : (
                <Sun className="h-5 w-5 shrink-0" />
              )}
              <span className="group-data-[collapsible=icon]:hidden">
                {theme === "light" ? t("theme.switchToDark") : t("theme.switchToLight")}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            {isAuthenticated ? (
              <SidebarMenuButton
                onClick={() => logout()}
                tooltip={t("nav.logout")}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="button-sidebar-logout"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {t("nav.logout")}
                </span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                asChild
                tooltip={t("nav.login")}
                data-testid="button-sidebar-login"
              >
                <a href="/api/login">
                  <LogIn className="h-5 w-5 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t("nav.login")}
                  </span>
                </a>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
