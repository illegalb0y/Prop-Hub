import { Heart, Map, User, Search, X, LogOut, Menu } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle">
          <Menu className="h-6 w-6 stroke-[2.5px]" />
        </SidebarTrigger>
      </div>

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("header.searchPlaceholder")}
            className="w-full rounded-full pl-10 pr-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="input-header-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => onSearchChange("")}
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <Button variant="ghost" size="icon" asChild data-testid="button-favorites">
          <Link href="/favorites">
            <Heart className="h-5 w-5" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild data-testid="button-map">
          <Link href="/map">
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
