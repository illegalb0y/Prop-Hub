import { Heart, Map, User, LogOut, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [location] = useLocation();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-[1001] flex h-16 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle">
          <Menu className="h-6 w-6 stroke-[2.5px]" />
        </SidebarTrigger>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <Button variant="ghost" size="icon" asChild data-testid="button-favorites">
          <Link href="/favorites">
            <Heart className="h-5 w-5" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild data-testid="button-map">
          <Link href={location === "/map" ? "/" : "/map"}>
            <Map className="h-5 w-5" />
          </Link>
        </Button>

        {isLoading ? (
          <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        ) : isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl ?? undefined} alt={user.firstName ?? "User"} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer" data-testid="link-my-account">
                  <User className="mr-2 h-4 w-4" />
                  {t("nav.account")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/favorites" className="cursor-pointer" data-testid="link-my-favorites">
                  <Heart className="mr-2 h-4 w-4" />
                  {t("nav.favorites")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer text-destructive"
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild data-testid="button-login">
            <a href="/api/login">{t("nav.login")}</a>
          </Button>
        )}
      </div>
    </header>
  );
}
