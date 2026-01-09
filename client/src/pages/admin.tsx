import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import ImportLogsSection from "@/components/import-logs-section";
import {
  LayoutDashboard,
  Users,
  Building2,
  Landmark,
  FolderKanban,
  Download,
  Upload,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Ban,
  ShieldCheck,
  FileText,
  RefreshCw,
  TrendingUp,
  Activity,
  Shield,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUpDown, RotateCcw, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar"; // <- Добавить эту строку
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

type AdminSection =
  | "dashboard"
  | "users"
  | "projects"
  | "developers"
  | "banks"
  | "security"
  | "ip-bans"
  | "sessions"
  | "audit-logs"
  | "import-logs";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DashboardStats {
  userCount: number;
  projectCount: number;
  bannedUserCount: number;
  ipBanCount: number;
  developerCount: number;
  bankCount: number;
  recentImports: any[];
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string | null;
}

interface Developer {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
  deletedAt: string | null;
  projectCount?: number;
}

interface Bank {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
  deletedAt: string | null;
  developers?: Developer[];
}

interface Project {
  id: number;
  name: string;
  developerId: number;
  cityId: number;
  districtId: number;
  address: string | null;
  shortDescription: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  priceFrom: string | null;
  currency: string | null;
  completionDate: string | null;
  deletedAt: string | null;
}

interface City {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  cityId: number;
}

interface IpBan {
  id: string;
  ip: string;
  cidr: string | null;
  reason: string | null;
  createdAt: string;
  expiresAt: string | null;
  createdByAdminId: string | null;
}

interface Session {
  sid: string;
  userId: string | null;
  userEmail: string | null;
  userAgent: string | null;
  ip: string | null;
  lastActivity: string;
  expire: string;
  isActive: boolean;
}

interface SecurityStats {
  activeSessionCount: number;
  totalSessionCount: number;
  expiredSessionCount: number;
}

interface AuditLogEntry {
  id: string;
  adminId: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  createdAt: string;
  metadataJson: any;
}

interface AuditLogFilters {
  adminId?: string;
  actionType?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SecurityAnalytics {
  hourlyActivity: Array<{ hour: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  topActions: Array<{ actionType: string; count: number }>;
  weeklyStats: Array<{ date: string; count: number }>;
  suspiciousActivity: Array<{
    ip: string;
    actionCount: number;
    uniqueAdmins: number;
    lastAction: string;
  }>;
  timeRanges: {
    last24Hours: string;
    last7Days: string;
    last30Days: string;
  };
}

interface SessionAnalytics {
  sessionsByHour: Array<{ hour: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  expirationStats: Array<{ timeToExpire: string; count: number }>;
}

const navigationItems = [
  {
    section: "Product Analytics",
    items: [
      {
        id: "dashboard" as AdminSection,
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      { id: "users" as AdminSection, label: "Users", icon: Users },
    ],
  },
  {
    section: "Data",
    items: [
      { id: "projects" as AdminSection, label: "Projects", icon: FolderKanban },
      {
        id: "developers" as AdminSection,
        label: "Developers",
        icon: Building2,
      },
      { id: "banks" as AdminSection, label: "Banks", icon: Landmark },
      { id: "import-logs" as AdminSection, label: "Data Import Logs", icon: FileText },
    ],
  },
  {
    section: "Security",
    items: [
      {
        id: "security" as AdminSection,
        label: "Security Overview",
        icon: Shield,
      },
      { id: "ip-bans" as AdminSection, label: "IP Bans", icon: Ban },
      {
        id: "sessions" as AdminSection,
        label: "Active Sessions",
        icon: Activity,
      },
      { id: "audit-logs" as AdminSection, label: "Audit Logs", icon: FileText },
    ],
  },
];

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");

  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        data-testid="admin-loading"
      >
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Development mode bypass - allows viewing admin pages without authentication
  const isDev = import.meta.env.DEV;

  if (!isDev && (!user || user.role !== "admin")) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="flex h-full" data-testid="admin-page">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-6 max-w-[1400px] mx-auto">
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "users" && <UsersSection />}
          {activeSection === "projects" && <ProjectsSection />}
          {activeSection === "developers" && <DevelopersSection />}
          {activeSection === "banks" && <BanksSection />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "ip-bans" && <IpBansSection />}
          {activeSection === "sessions" && <SessionsSection />}
          {activeSection === "audit-logs" && <AuditLogsSection />}
          {activeSection === "import-logs" && <ImportLogsSection />}
        </div>
      </main>
    </div>
  );
}

function AdminSidebar({
  activeSection,
  onSectionChange,
}: {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}) {
  return (
    <aside
      className="w-64 border-r bg-sidebar flex flex-col"
      data-testid="admin-sidebar"
    >
      <div className="p-4 border-b">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Admin Panel
        </h1>
      </div>
      <ScrollArea className="flex-1 p-3">
        {navigationItems.map((group) => (
          <div key={group.section} className="mb-4">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover-elevate"
                    }`}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}

function DashboardSection() {
  return <AnalyticsDashboard />;
}

function QuickExportButton({
  entity,
  label,
}: {
  entity: string;
  label: string;
}) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/${entity}/export`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: `${label} downloaded successfully` });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={handleExport}
      disabled={isExporting}
      data-testid={`button-export-${entity}`}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : label}
    </Button>
  );
}

function UsersSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");

  const {
    data: users,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<User>>({
    queryKey: ["/api/admin/users", { page, search }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string },
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
        search: params.search,
      });
      const res = await apiRequest(
        "GET",
        `/api/admin/users?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason: string;
    }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
    },
    onSuccess: () => {
      toast({ title: "User banned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason("");
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      toast({ title: "User unbanned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to unban user", variant: "destructive" });
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, {
        role: "admin",
      });
    },
    onSuccess: () => {
      toast({ title: "User promoted to admin" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to promote user", variant: "destructive" });
    },
  });

  const demoteFromAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, {
        role: "user",
      });
    },
    onSuccess: () => {
      toast({ title: "User demoted from admin" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to demote user", variant: "destructive" });
    },
  });

  const handleBanClick = (user: User) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  if (isLoading) {
    return <SectionSkeleton title="Users" />;
  }

  return (
    <div className="space-y-6" data-testid="users-section">
      <SectionHeader
        title="Users"
        description="Manage user accounts and permissions"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          data-testid="button-refresh-users"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">User</th>
                  <th className="text-left p-4 font-medium text-sm">Email</th>
                  <th className="text-left p-4 font-medium text-sm">Role</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-sm">Joined</th>
                  <th className="text-right p-4 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users?.data?.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0"
                    data-testid={`user-row-${user.id}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.profileImageUrl || undefined}
                          />
                          <AvatarFallback>
                            {user.firstName?.[0] || user.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.email || "—"}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.bannedAt ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300"
                        >
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.createdAt
                        ? format(new Date(user.createdAt), "MMM d, yyyy")
                        : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-user-actions-${user.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.bannedAt ? (
                            <DropdownMenuItem
                              onClick={() => unbanMutation.mutate(user.id)}
                              data-testid={`button-unban-${user.id}`}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Unban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleBanClick(user)}
                              className="text-destructive"
                              data-testid={`button-ban-${user.id}`}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.role === "admin" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                demoteFromAdminMutation.mutate(user.id)
                              }
                              data-testid={`button-demote-${user.id}`}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Demote from Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                promoteToAdminMutation.mutate(user.id)
                              }
                              data-testid={`button-promote-${user.id}`}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Promote to Admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!users?.data || users.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={users?.totalPages || 1}
        onPageChange={setPage}
      />

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.email || "this user"} from accessing the
              platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason for ban</Label>
              <Textarea
                id="ban-reason"
                placeholder="Enter reason for banning this user..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                data-testid="input-ban-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedUser &&
                banMutation.mutate({
                  userId: selectedUser.id,
                  reason: banReason,
                })
              }
              disabled={banMutation.isPending}
              data-testid="button-confirm-ban"
            >
              {banMutation.isPending ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectsSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "deleted" | "all">("active");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"delete" | "restore">("delete");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [lastImportJobId, setLastImportJobId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    developerId: "",
    cityId: "",
    districtId: "",
    latitude: "",
    longitude: "",
    address: "",
    shortDescription: "",
    description: "",
    priceFrom: "",
    currency: "USD",
    completionDate: "",
  });

  const {
    data: projects,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<Project>>({
    queryKey: ["/api/admin/projects", { page, search, status, sortBy, sortOrder }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string; status: string; sortBy: string; sortOrder: string },
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
        search: params.search,
        status: params.status,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
      const res = await apiRequest(
        "GET",
        `/api/admin/projects?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  const { data: developers } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: cities } = useQuery<City[]>({
    queryKey: ["/api/cities"],
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts", formData.cityId],
    queryFn: async ({ queryKey }) => {
      const [_base, cityId] = queryKey as [string, string];
      const searchParams = new URLSearchParams();
      if (cityId) {
        searchParams.append("cityId", cityId);
      }
      const res = await apiRequest(
        "GET",
        `/api/districts?${searchParams.toString()}`,
      );
      return res.json();
    },
    enabled: !!formData.cityId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/projects", data);
    },
    onSuccess: () => {
      toast({ title: "Project created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/admin/projects/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Project updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update project", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/projects/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Project deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: () => {
      toast({ title: "Failed to delete project", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/admin/projects/${id}/restore`);
    },
    onSuccess: () => {
      toast({ title: "Project restored" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: () => {
      toast({ title: "Failed to restore project", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/projects/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: (result) => {
      setSelectedIds([]);
      setBulkActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      const successCount = result.succeededIds?.length || 0;
      const failCount = result.failed?.length || 0;
      if (failCount > 0) {
        toast({ title: `Deleted ${successCount} projects, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: `Deleted ${successCount} projects successfully` });
      }
    },
    onError: () => {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/projects/bulk-restore", { ids });
      return res.json();
    },
    onSuccess: (result) => {
      setSelectedIds([]);
      setBulkActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      const successCount = result.succeededIds?.length || 0;
      const failCount = result.failed?.length || 0;
      if (failCount > 0) {
        toast({ title: `Restored ${successCount} projects, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: `Restored ${successCount} projects successfully` });
      }
    },
    onError: () => {
      toast({ title: "Bulk restore failed", variant: "destructive" });
    },
  });

  const handleSelectAll = () => {
    if (!projects?.data) return;
    if (selectedIds.length === projects.data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.data.map((p) => p.id));
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openBulkActionDialog = (action: "delete" | "restore") => {
    setBulkActionType(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = () => {
    if (bulkActionType === "delete") {
      bulkDeleteMutation.mutate(selectedIds);
    } else {
      bulkRestoreMutation.mutate(selectedIds);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) return;
      const formData = new FormData();
      formData.append("file", importFile);
      const csrfCookie = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("_csrf="));
      const csrfToken = csrfCookie?.split("=")[1] || "";
      const response = await fetch("/api/admin/projects/import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
      });
      if (!response.ok) throw new Error("Import failed");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Import started successfully" });
      setImportFile(null);
      if (data?.jobId) {
        setLastImportJobId(data.jobId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
    },
  });

  const undoImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/admin/imports/${jobId}/undo`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({ title: data.message || "Import undone successfully" });
      setLastImportJobId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: async (error: any) => {
      const message = error?.message || "Failed to undo import";
      toast({ title: message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/projects/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "projects.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Projects exported successfully" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProject(null);
    setFormData({
      name: "",
      developerId: "",
      cityId: "",
      districtId: "",
      latitude: "",
      longitude: "",
      address: "",
      shortDescription: "",
      description: "",
      priceFrom: "",
      currency: "USD",
      completionDate: "",
    });
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      developerId: "",
      cityId: "",
      districtId: "",
      latitude: "",
      longitude: "",
      address: "",
      shortDescription: "",
      description: "",
      priceFrom: "",
      currency: "USD",
      completionDate: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      developerId: project.developerId.toString(),
      cityId: project.cityId.toString(),
      districtId: project.districtId.toString(),
      latitude: project.latitude?.toString() || "",
      longitude: project.longitude?.toString() || "",
      address: project.address || "",
      shortDescription: project.shortDescription || "",
      description: project.description || "",
      priceFrom: project.priceFrom?.toString() || "",
      currency: project.currency || "USD",
      completionDate: project.completionDate
        ? project.completionDate.split("T")[0]
        : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      developerId: parseInt(formData.developerId),
      cityId: parseInt(formData.cityId),
      districtId: parseInt(formData.districtId),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      priceFrom: formData.priceFrom ? parseInt(formData.priceFrom) : null,
      completionDate: formData.completionDate
        ? new Date(formData.completionDate).toISOString()
        : null,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <SectionSkeleton title="Projects" />;
  }

  return (
    <div className="space-y-6" data-testid="projects-section">
      <SectionHeader
        title="Projects"
        description="Manage real estate projects"
        actions={
          <Button onClick={openCreateDialog} data-testid="button-add-project">
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); setSelectedIds([]); }}>
          <SelectTrigger className="w-32" data-testid="select-project-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(1); }}>
          <SelectTrigger className="w-36" data-testid="select-project-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          data-testid="button-toggle-sort-order"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-projects"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border flex-1 min-w-0">
            <div className="relative flex items-center flex-1 min-w-0">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 w-full pr-8"
                data-testid="input-import-projects"
                key={importFile ? 'file-selected' : 'file-cleared'}
              />
              {importFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 absolute right-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setImportFile(null)}
                  data-testid="button-clear-import-projects"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="shrink-0"
              data-testid="button-import-projects"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
          {lastImportJobId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoImportMutation.mutate(lastImportJobId)}
              disabled={undoImportMutation.isPending}
              className="text-destructive hover:text-destructive"
              data-testid="button-undo-import-projects"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {undoImportMutation.isPending ? "Undoing..." : "Undo Import"}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-projects"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          {status === "active" || status === "all" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openBulkActionDialog("delete")}
              data-testid="button-bulk-delete-projects"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          ) : null}
          {status === "deleted" || status === "all" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkActionDialog("restore")}
              data-testid="button-bulk-restore-projects"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Selected
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
            data-testid="button-clear-selection"
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="p-4 w-12">
                    <Checkbox
                      checked={projects?.data && projects.data.length > 0 && selectedIds.length === projects.data.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-projects"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-sm">ID</th>
                  <th className="text-left p-4 font-medium text-sm">Name</th>
                  <th className="text-left p-4 font-medium text-sm">Price</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-right p-4 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects?.data?.map((project) => (
                  <tr
                    key={project.id}
                    className={`border-b last:border-0 ${selectedIds.includes(project.id) ? 'bg-muted/30' : ''}`}
                    data-testid={`project-row-${project.id}`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(project.id)}
                        onCheckedChange={() => handleSelectItem(project.id)}
                        data-testid={`checkbox-project-${project.id}`}
                      />
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      #{project.id}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.address && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {project.address}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {project.priceFrom
                        ? `${Number(project.priceFrom).toLocaleString()} ${project.currency || ""}`
                        : "—"}
                    </td>
                    <td className="p-4">
                      {project.deletedAt ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300"
                        >
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-project-actions-${project.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(project)}
                            data-testid={`button-edit-project-${project.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {project.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(project.id)}
                              data-testid={`button-restore-${project.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(project.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${project.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!projects?.data || projects.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No projects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={projects?.totalPages || 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Add Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update project details"
                : "Create a new real estate project"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-full">
              <Label htmlFor="proj-name">Project Name</Label>
              <Input
                id="proj-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="The Manhattan Tower"
                data-testid="input-project-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-developer">Developer</Label>
              <Select
                value={formData.developerId}
                onValueChange={(value) =>
                  setFormData({ ...formData, developerId: value })
                }
              >
                <SelectTrigger data-testid="select-project-developer">
                  <SelectValue placeholder="Select Developer" />
                </SelectTrigger>
                <SelectContent>
                  {developers?.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id.toString()}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-city">City</Label>
              <Select
                value={formData.cityId}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    cityId: value,
                    districtId: "",
                  })
                }
              >
                <SelectTrigger data-testid="select-project-city">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((city) => (
                    <SelectItem key={city.id} value={city.id.toString()}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-district">District</Label>
              <Select
                value={formData.districtId}
                onValueChange={(value) =>
                  setFormData({ ...formData, districtId: value })
                }
                disabled={!formData.cityId}
              >
                <SelectTrigger data-testid="select-project-district">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {districts?.map((district) => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-price">Price From</Label>
              <Input
                id="proj-price"
                type="number"
                value={formData.priceFrom}
                onChange={(e) =>
                  setFormData({ ...formData, priceFrom: e.target.value })
                }
                placeholder="1500000"
                data-testid="input-project-price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-currency">Currency</Label>
              <Input
                id="proj-currency"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                placeholder="USD"
                data-testid="input-project-currency"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-completion">Completion date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-completion-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.completionDate
                      ? format(new Date(formData.completionDate), "dd.MM.yyyy")
                      : "Choose the date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      formData.completionDate
                        ? new Date(formData.completionDate)
                        : undefined
                    }
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        completionDate: date
                          ? date.toISOString().split("T")[0]
                          : "",
                      })
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-lat">Latitude</Label>
              <Input
                id="proj-lat"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                placeholder="40.758"
                data-testid="input-project-lat"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-lng">Longitude</Label>
              <Input
                id="proj-lng"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                placeholder="-73.9855"
                data-testid="input-project-lng"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="proj-address">Address</Label>
              <Input
                id="proj-address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="350 5th Avenue, New York, NY 10118"
                data-testid="input-project-address"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="proj-short">Short Description</Label>
              <Input
                id="proj-short"
                value={formData.shortDescription}
                onChange={(e) =>
                  setFormData({ ...formData, shortDescription: e.target.value })
                }
                placeholder="Luxury condominiums in the heart of Midtown Manhattan"
                data-testid="input-project-short-desc"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="proj-desc">Full Description</Label>
              <Textarea
                id="proj-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detailed description of the project and its amenities..."
                className="h-32"
                data-testid="input-project-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                !formData.developerId ||
                !formData.cityId ||
                !formData.districtId ||
                !formData.latitude ||
                !formData.longitude ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              data-testid="button-save-project"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingProject
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionType === "delete" ? "Delete Projects" : "Restore Projects"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionType === "delete"
                ? `Are you sure you want to delete ${selectedIds.length} project(s)? They can be restored later.`
                : `Are you sure you want to restore ${selectedIds.length} project(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={bulkActionType === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              data-testid="button-confirm-bulk-action"
            >
              {bulkDeleteMutation.isPending || bulkRestoreMutation.isPending
                ? "Processing..."
                : bulkActionType === "delete"
                  ? "Delete"
                  : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DevelopersSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "deleted" | "all">("active");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"delete" | "restore">("delete");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    description: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [lastImportJobId, setLastImportJobId] = useState<string | null>(null);

  const {
    data: developers,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<Developer>>({
    queryKey: ["/api/admin/developers", { page, search, status, sortBy, sortOrder }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string; status: string; sortBy: string; sortOrder: string },
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
        search: params.search,
        status: params.status,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
      const res = await apiRequest(
        "GET",
        `/api/admin/developers?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/developers", data);
    },
    onSuccess: () => {
      toast({ title: "Developer created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create developer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/developers/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Developer updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update developer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/developers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Developer deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
    },
    onError: () => {
      toast({ title: "Failed to delete developer", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/admin/developers/${id}/restore`);
    },
    onSuccess: () => {
      toast({ title: "Developer restored" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
    },
    onError: () => {
      toast({ title: "Failed to restore developer", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/developers/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: (result) => {
      setSelectedIds([]);
      setBulkActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
      const successCount = result.succeededIds?.length || 0;
      const failCount = result.failed?.length || 0;
      if (failCount > 0) {
        toast({ title: `Deleted ${successCount} developers, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: `Deleted ${successCount} developers successfully` });
      }
    },
    onError: () => {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/developers/bulk-restore", { ids });
      return res.json();
    },
    onSuccess: (result) => {
      setSelectedIds([]);
      setBulkActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
      const successCount = result.succeededIds?.length || 0;
      const failCount = result.failed?.length || 0;
      if (failCount > 0) {
        toast({ title: `Restored ${successCount} developers, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: `Restored ${successCount} developers successfully` });
      }
    },
    onError: () => {
      toast({ title: "Bulk restore failed", variant: "destructive" });
    },
  });

  const handleSelectAll = () => {
    if (!developers?.data) return;
    if (selectedIds.length === developers.data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(developers.data.map((d) => d.id));
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openBulkActionDialog = (action: "delete" | "restore") => {
    setBulkActionType(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = () => {
    if (bulkActionType === "delete") {
      bulkDeleteMutation.mutate(selectedIds);
    } else {
      bulkRestoreMutation.mutate(selectedIds);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) return;
      const formData = new FormData();
      formData.append("file", importFile);
      const csrfCookie = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("_csrf="));
      const csrfToken = csrfCookie?.split("=")[1] || "";
      const response = await fetch("/api/admin/developers/import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
      });
      if (!response.ok) throw new Error("Import failed");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Import started successfully" });
      setImportFile(null);
      if (data?.jobId) {
        setLastImportJobId(data.jobId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
    },
  });

  const undoImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/admin/imports/${jobId}/undo`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({ title: data.message || "Import undone successfully" });
      setLastImportJobId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
    },
    onError: async (error: any) => {
      const message = error?.message || "Failed to undo import";
      toast({ title: message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDeveloper(null);
    setFormData({ name: "", logoUrl: "", description: "" });
  };

  const openCreateDialog = () => {
    setEditingDeveloper(null);
    setFormData({ name: "", logoUrl: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (developer: Developer) => {
    setEditingDeveloper(developer);
    setFormData({
      name: developer.name,
      logoUrl: developer.logoUrl || "",
      description: developer.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingDeveloper) {
      updateMutation.mutate({ id: editingDeveloper.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/developers/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "developers.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Developers exported successfully" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <SectionSkeleton title="Developers" />;
  }

  return (
    <div className="space-y-6" data-testid="developers-section">
      <SectionHeader
        title="Developers"
        description="Manage property developers"
        actions={
          <Button onClick={openCreateDialog} data-testid="button-add-developer">
            <Plus className="h-4 w-4 mr-2" />
            Add Developer
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search developers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-developers"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); setSelectedIds([]); }}>
          <SelectTrigger className="w-32" data-testid="select-developer-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(1); }}>
          <SelectTrigger className="w-36" data-testid="select-developer-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          data-testid="button-toggle-developer-sort-order"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-developers"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border flex-1 min-w-0">
            <div className="relative flex items-center flex-1 min-w-0">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 w-full pr-8"
                data-testid="input-import-developers"
                key={importFile ? 'file-selected' : 'file-cleared'}
              />
              {importFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 absolute right-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setImportFile(null)}
                  data-testid="button-clear-import-developers"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="shrink-0"
              data-testid="button-import-developers"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
          {lastImportJobId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoImportMutation.mutate(lastImportJobId)}
              disabled={undoImportMutation.isPending}
              className="text-destructive hover:text-destructive"
              data-testid="button-undo-import-developers"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {undoImportMutation.isPending ? "Undoing..." : "Undo Import"}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-developers"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          {status === "active" || status === "all" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openBulkActionDialog("delete")}
              data-testid="button-bulk-delete-developers"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          ) : null}
          {status === "deleted" || status === "all" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkActionDialog("restore")}
              data-testid="button-bulk-restore-developers"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Selected
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
            data-testid="button-clear-developer-selection"
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="p-4 w-12">
                    <Checkbox
                      checked={developers?.data && developers.data.length > 0 && selectedIds.length === developers.data.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-developers"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    Developer
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    Description
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    Status
                  </th>
                  <th className="text-right p-4 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {developers?.data?.map((developer) => (
                  <tr
                    key={developer.id}
                    className={`border-b last:border-0 ${selectedIds.includes(developer.id) ? 'bg-muted/30' : ''}`}
                    data-testid={`developer-row-${developer.id}`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(developer.id)}
                        onCheckedChange={() => handleSelectItem(developer.id)}
                        data-testid={`checkbox-developer-${developer.id}`}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={developer.logoUrl || undefined} />
                          <AvatarFallback>
                            <Building2 className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{developer.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                      {developer.description || "—"}
                    </td>
                    <td className="p-4">
                      {developer.deletedAt ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300"
                        >
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-developer-actions-${developer.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(developer)}
                            data-testid={`button-edit-developer-${developer.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {developer.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(developer.id)}
                              data-testid={`button-restore-developer-${developer.id}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(developer.id)}
                              className="text-destructive"
                              data-testid={`button-delete-developer-${developer.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!developers?.data || developers.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No developers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={developers?.totalPages || 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDeveloper ? "Edit Developer" : "Add Developer"}
            </DialogTitle>
            <DialogDescription>
              {editingDeveloper
                ? "Update developer details"
                : "Create a new property developer"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dev-name">Name</Label>
              <Input
                id="dev-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Developer name"
                data-testid="input-developer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-logo">Logo URL</Label>
              <Input
                id="dev-logo"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, logoUrl: e.target.value })
                }
                placeholder="https://..."
                data-testid="input-developer-logo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-desc">Description</Label>
              <Textarea
                id="dev-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description..."
                data-testid="input-developer-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              data-testid="button-save-developer"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingDeveloper
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionType === "delete" ? "Delete Developers" : "Restore Developers"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionType === "delete"
                ? `Are you sure you want to delete ${selectedIds.length} developer(s)? They can be restored later.`
                : `Are you sure you want to restore ${selectedIds.length} developer(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-developer-bulk-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={bulkActionType === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              data-testid="button-confirm-developer-bulk-action"
            >
              {bulkDeleteMutation.isPending || bulkRestoreMutation.isPending
                ? "Processing..."
                : bulkActionType === "delete"
                  ? "Delete"
                  : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BanksSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "deleted" | "all">("active");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"delete" | "restore">("delete");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    description: "",
    developerIds: [] as number[],
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [lastImportJobId, setLastImportJobId] = useState<string | null>(null);

  const {
    data: banks,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<Bank>>({
    queryKey: ["/api/admin/banks", { page, search, status, sortBy, sortOrder }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string; status: string; sortBy: string; sortOrder: string },
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
        status: params.status,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: params.search,
      });
      const res = await apiRequest(
        "GET",
        `/api/admin/banks?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  // Загрузка списка застройщиков
  const { data: developers } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/developers");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/banks", data);
    },
    onSuccess: () => {
      toast({ title: "Bank created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create bank", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/banks/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Bank updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update bank", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/banks/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Bank deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
    },
    onError: () => {
      toast({ title: "Failed to delete bank", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/admin/banks/${id}/restore`);
    },
    onSuccess: () => {
      toast({ title: "Bank restored" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
    },
    onError: () => {
      toast({ title: "Failed to restore bank", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/banks/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: (result) => {
      setSelectedIds([]);
      setBulkActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
      const successCount = result.succeededIds?.length || 0;
      const failCount = result.failed?.length || 0;
      if (failCount > 0) {
        toast({ title: `Deleted ${successCount} banks, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: `Deleted ${successCount} banks successfully` });
      }
    },
    onError: () => {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/banks/bulk-restore", { ids });
      return res.json();
    },
    onSuccess: (result) => {
      setSelectedIds([]);
      setBulkActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
      const successCount = result.succeededIds?.length || 0;
      const failCount = result.failed?.length || 0;
      if (failCount > 0) {
        toast({ title: `Restored ${successCount} banks, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: `Restored ${successCount} banks successfully` });
      }
    },
    onError: () => {
      toast({ title: "Bulk restore failed", variant: "destructive" });
    },
  });

  const handleSelectAll = () => {
    if (!banks?.data) return;
    if (selectedIds.length === banks.data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(banks.data.map((b) => b.id));
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openBulkActionDialog = (action: "delete" | "restore") => {
    setBulkActionType(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = () => {
    if (bulkActionType === "delete") {
      bulkDeleteMutation.mutate(selectedIds);
    } else {
      bulkRestoreMutation.mutate(selectedIds);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) return;
      const formData = new FormData();
      formData.append("file", importFile);
      const csrfCookie = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("_csrf="));
      const csrfToken = csrfCookie?.split("=")[1] || "";
      const response = await fetch("/api/admin/banks/import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
      });
      if (!response.ok) throw new Error("Import failed");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Import started successfully" });
      setImportFile(null);
      if (data?.jobId) {
        setLastImportJobId(data.jobId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
    },
  });

  const undoImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/admin/imports/${jobId}/undo`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({ title: data.message || "Import undone successfully" });
      setLastImportJobId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
    },
    onError: async (error: any) => {
      const message = error?.message || "Failed to undo import";
      toast({ title: message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBank(null);
    setFormData({ name: "", logoUrl: "", description: "", developerIds: [] });
  };

  const openCreateDialog = () => {
    setEditingBank(null);
    setFormData({ name: "", logoUrl: "", description: "", developerIds: [] });
    setDialogOpen(true);
  };

  const openEditDialog = async (bank: Bank) => {
    setEditingBank(bank);

    // Загрузить список застройщиков для банка
    let bankDeveloperIds: number[] = [];
    try {
      const res = await apiRequest("GET", `/api/admin/banks/${bank.id}/developers`);
      const bankDevelopers = await res.json();
      bankDeveloperIds = bankDevelopers.map((d: Developer) => d.id);
    } catch (error) {
      console.error("Failed to load bank developers:", error);
    }

    setFormData({
      name: bank.name,
      logoUrl: bank.logoUrl || "",
      description: bank.description || "",
      developerIds: bankDeveloperIds,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingBank) {
      updateMutation.mutate({ id: editingBank.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/banks/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "banks.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Banks exported successfully" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const toggleDeveloper = (developerId: number) => {
    setFormData(prev => ({
      ...prev,
      developerIds: prev.developerIds.includes(developerId)
        ? prev.developerIds.filter(id => id !== developerId)
        : [...prev.developerIds, developerId]
    }));
  };

  if (isLoading) {
    return <SectionSkeleton title="Banks" />;
  }

  return (
    <div className="space-y-6" data-testid="banks-section">
      <SectionHeader
        title="Banks"
        description="Manage partner banks"
        actions={
          <Button onClick={openCreateDialog} data-testid="button-add-bank">
            <Plus className="h-4 w-4 mr-2" />
            Add Bank
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search banks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-banks"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); setSelectedIds([]); }}>
          <SelectTrigger className="w-32" data-testid="select-bank-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(1); }}>
          <SelectTrigger className="w-36" data-testid="select-bank-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          data-testid="button-toggle-bank-sort-order"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-banks"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border flex-1 min-w-0">
            <div className="relative flex items-center flex-1 min-w-0">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 w-full pr-8"
                data-testid="input-import-banks"
                key={importFile ? 'file-selected' : 'file-cleared'}
              />
              {importFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 absolute right-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setImportFile(null)}
                  data-testid="button-clear-import-banks"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="shrink-0"
              data-testid="button-import-banks"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
          {lastImportJobId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoImportMutation.mutate(lastImportJobId)}
              disabled={undoImportMutation.isPending}
              className="text-destructive hover:text-destructive"
              data-testid="button-undo-import-banks"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {undoImportMutation.isPending ? "Undoing..." : "Undo Import"}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-banks"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          {status === "active" || status === "all" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openBulkActionDialog("delete")}
              data-testid="button-bulk-delete-banks"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          ) : null}
          {status === "deleted" || status === "all" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkActionDialog("restore")}
              data-testid="button-bulk-restore-banks"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Selected
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
            data-testid="button-clear-bank-selection"
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="p-4 w-12">
                    <Checkbox
                      checked={banks?.data && banks.data.length > 0 && selectedIds.length === banks.data.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-banks"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-sm">Bank</th>
                  <th className="text-left p-4 font-medium text-sm">
                    Description
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    Status
                  </th>
                  <th className="text-right p-4 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {banks?.data?.map((bank) => (
                  <tr
                    key={bank.id}
                    className={`border-b last:border-0 ${selectedIds.includes(bank.id) ? 'bg-muted/30' : ''}`}
                    data-testid={`bank-row-${bank.id}`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(bank.id)}
                        onCheckedChange={() => handleSelectItem(bank.id)}
                        data-testid={`checkbox-bank-${bank.id}`}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={bank.logoUrl || undefined} />
                          <AvatarFallback>
                            <Landmark className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{bank.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                      {bank.description || "—"}
                    </td>
                    <td className="p-4">
                      {bank.deletedAt ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300"
                        >
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-bank-actions-${bank.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(bank)}
                            data-testid={`button-edit-bank-${bank.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {bank.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(bank.id)}
                              data-testid={`button-restore-bank-${bank.id}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(bank.id)}
                              className="text-destructive"
                              data-testid={`button-delete-bank-${bank.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!banks?.data || banks.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No banks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={banks?.totalPages || 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Bank" : "Add Bank"}</DialogTitle>
            <DialogDescription>
              {editingBank
                ? "Update bank details"
                : "Create a new partner bank"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Name</Label>
              <Input
                id="bank-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Bank name"
                data-testid="input-bank-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-logo">Logo URL</Label>
              <Input
                id="bank-logo"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, logoUrl: e.target.value })
                }
                placeholder="https://..."
                data-testid="input-bank-logo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-desc">Description</Label>
              <Textarea
                id="bank-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description..."
                data-testid="input-bank-description"
              />
            </div>
            {/* Partner Developers */}
            <div className="space-y-2">
              <Label>Partner Developers (Optional)</Label>
              <ScrollArea className="border rounded-md p-3 max-h-48">
                {developers && developers.length > 0 ? (
                  <div className="space-y-2">
                    {developers.map((dev) => (
                      <div key={dev.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dev-${dev.id}`}
                          checked={formData.developerIds.includes(dev.id)}
                          onCheckedChange={() => toggleDeveloper(dev.id)}
                        />
                        <label
                          htmlFor={`dev-${dev.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {dev.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No developers available</p>
                )}
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Select developers that partner with this bank
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              data-testid="button-save-bank"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingBank
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionType === "delete" ? "Delete Banks" : "Restore Banks"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionType === "delete"
                ? `Are you sure you want to delete ${selectedIds.length} bank(s)? They can be restored later.`
                : `Are you sure you want to restore ${selectedIds.length} bank(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bank-bulk-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={bulkActionType === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              data-testid="button-confirm-bank-bulk-action"
            >
              {bulkDeleteMutation.isPending || bulkRestoreMutation.isPending
                ? "Processing..."
                : bulkActionType === "delete"
                  ? "Delete"
                  : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AuditLogsSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: auditLogs,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<AuditLogEntry>>({
    queryKey: ["/api/admin/audit-logs", { page, ...filters }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "20",
      });

      // Добавляем фильтры в параметры запроса
      if (params.adminId) searchParams.append("userId", params.adminId);
      if (params.actionType)
        searchParams.append("actionType", params.actionType);
      if (params.targetType)
        searchParams.append("targetType", params.targetType);
      if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
      if (params.dateTo) searchParams.append("dateTo", params.dateTo);

      const res = await apiRequest(
        "GET",
        `/api/admin/audit-logs?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  const { data: users } = useQuery<PaginatedResult<User>>({
    queryKey: ["/api/admin/users", { page: 1, search: "" }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        "/api/admin/users?page=1&limit=100&search=",
      );
      return res.json();
    },
  });

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const applyFilters = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const getActionTypeColor = (actionType: string) => {
    if (actionType.includes("delete") || actionType.includes("ban"))
      return "text-red-600";
    if (actionType.includes("create") || actionType.includes("add"))
      return "text-green-600";
    if (actionType.includes("update") || actionType.includes("edit"))
      return "text-blue-600";
    return "text-muted-foreground";
  };

  const getActionTypeIcon = (actionType: string) => {
    if (actionType.includes("delete")) return <Trash2 className="h-3 w-3" />;
    if (actionType.includes("ban")) return <Ban className="h-3 w-3" />;
    if (actionType.includes("create") || actionType.includes("add"))
      return <Plus className="h-3 w-3" />;
    if (actionType.includes("update") || actionType.includes("edit"))
      return <Pencil className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  if (isLoading) {
    return <SectionSkeleton title="Audit Logs" />;
  }

  return (
    <div className="space-y-6" data-testid="audit-logs-section">
      <SectionHeader
        title="Audit Logs"
        description="Track all administrative actions and system events"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh-audit-logs"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Search className="h-4 w-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        }
      />

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-admin">Admin User</Label>
                <select
                  id="filter-admin"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filters.adminId || ""}
                  onChange={(e) =>
                    applyFilters({
                      ...filters,
                      adminId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">All Admins</option>
                  {users?.data
                    ?.filter((user) => user.role === "admin")
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email ||
                          `${user.firstName} ${user.lastName}`.trim() ||
                          user.id}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-action">Action Type</Label>
                <select
                  id="filter-action"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filters.actionType || ""}
                  onChange={(e) =>
                    applyFilters({
                      ...filters,
                      actionType: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">All Actions</option>
                  <option value="user_ban">User Ban</option>
                  <option value="user_unban">User Unban</option>
                  <option value="user_role_change">Role Change</option>
                  <option value="ip_ban_add">IP Ban Add</option>
                  <option value="ip_ban_remove">IP Ban Remove</option>
                  <option value="session_terminate">Session Terminate</option>
                  <option value="project_create">Project Create</option>
                  <option value="project_update">Project Update</option>
                  <option value="project_delete">Project Delete</option>
                  <option value="developer_create">Developer Create</option>
                  <option value="developer_update">Developer Update</option>
                  <option value="developer_delete">Developer Delete</option>
                  <option value="bank_create">Bank Create</option>
                  <option value="bank_update">Bank Update</option>
                  <option value="bank_delete">Bank Delete</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-target">Target Type</Label>
                <select
                  id="filter-target"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filters.targetType || ""}
                  onChange={(e) =>
                    applyFilters({
                      ...filters,
                      targetType: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">All Targets</option>
                  <option value="user">User</option>
                  <option value="project">Project</option>
                  <option value="developer">Developer</option>
                  <option value="bank">Bank</option>
                  <option value="ip_ban">IP Ban</option>
                  <option value="session">Session</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-date-from">Date From</Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) =>
                    applyFilters({
                      ...filters,
                      dateFrom: e.target.value || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-date-to">Date To</Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) =>
                    applyFilters({
                      ...filters,
                      dateTo: e.target.value || undefined,
                    })
                  }
                />
              </div>

              <div className="flex items-end space-x-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex-1"
                >
                  Clear Filters
                </Button>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">
                    Timestamp
                  </th>
                  <th className="text-left p-4 font-medium text-sm">Admin</th>
                  <th className="text-left p-4 font-medium text-sm">Action</th>
                  <th className="text-left p-4 font-medium text-sm">Target</th>
                  <th className="text-left p-4 font-medium text-sm">
                    IP Address
                  </th>
                  <th className="text-left p-4 font-medium text-sm">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs?.data?.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-0"
                    data-testid={`audit-log-row-${log.id}`}
                  >
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="p-4 text-sm">
                      {users?.data?.find((u) => u.id === log.adminId)?.email ||
                        log.adminId}
                    </td>
                    <td className="p-4">
                      <div
                        className={`flex items-center gap-2 text-sm ${getActionTypeColor(log.actionType)}`}
                      >
                        {getActionTypeIcon(log.actionType)}
                        <span className="font-medium">
                          {log.actionType
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {log.targetType && log.targetId ? (
                        <div>
                          <span className="text-muted-foreground">
                            {log.targetType}:
                          </span>
                          <br />
                          <code className="text-xs bg-muted px-1 rounded">
                            {log.targetId}
                          </code>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {log.ip ? (
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {log.ip}
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-sm max-w-xs">
                      {log.metadataJson ? (
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">
                            View Details
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                            {JSON.stringify(log.metadataJson, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {(!auditLogs?.data || auditLogs.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No audit logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={auditLogs?.totalPages || 1}
        onPageChange={setPage}
      />
    </div>
  );
}

function SessionsSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const {
    data: sessions,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<Session>>({
    queryKey: ["/api/admin/sessions", { page, search }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string },
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
        search: params.search,
      });
      const res = await apiRequest(
        "GET",
        `/api/admin/sessions?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sid: string) => {
      return apiRequest("DELETE", `/api/admin/sessions/${sid}`);
    },
    onSuccess: () => {
      toast({ title: "Session terminated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sessions"] });
    },
    onError: () => {
      toast({ title: "Failed to terminate session", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <SectionSkeleton title="Active Sessions" />;
  }

  return (
    <div className="space-y-6" data-testid="sessions-section">
      <SectionHeader
        title="Active Sessions"
        description="Monitor and manage user sessions"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, IP, or user agent..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-sessions"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          data-testid="button-refresh-sessions"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">User</th>
                  <th className="text-left p-4 font-medium text-sm">
                    IP Address
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    User Agent
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    Last Activity
                  </th>
                  <th className="text-left p-4 font-medium text-sm">Expires</th>
                  <th className="text-right p-4 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions?.data?.map((session) => (
                  <tr
                    key={session.sid}
                    className="border-b last:border-0"
                    data-testid={`session-row-${session.sid}`}
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">
                          {session.userEmail || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {session.userId || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      {session.ip ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {session.ip}
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-sm max-w-xs truncate">
                      {session.userAgent || "—"}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(
                        new Date(session.lastActivity),
                        "MMM d, yyyy HH:mm",
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={
                          session.isActive ? "text-green-600" : "text-red-600"
                        }
                      >
                        {format(new Date(session.expire), "MMM d, yyyy HH:mm")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-session-actions-${session.sid}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(session.sid)}
                            className="text-destructive"
                            data-testid={`button-terminate-session-${session.sid}`}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Terminate Session
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!sessions?.data || sessions.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No active sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={sessions?.totalPages || 1}
        onPageChange={setPage}
      />
    </div>
  );
}

function IpBansSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    ip: "",
    cidr: "",
    reason: "",
    expiresAt: "",
  });

  const {
    data: ipBans,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<IpBan>>({
    queryKey: ["/api/admin/ip-bans", { page, search }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string },
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
      });
      const res = await apiRequest(
        "GET",
        `/api/admin/ip-bans?${searchParams.toString()}`,
      );
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/ip-bans", {
        ip: data.ip,
        cidr: data.cidr || null,
        reason: data.reason || null,
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : null,
      });
    },
    onSuccess: () => {
      toast({ title: "IP ban created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ip-bans"] });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create IP ban", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/ip-bans/${id}`);
    },
    onSuccess: () => {
      toast({ title: "IP ban removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ip-bans"] });
    },
    onError: () => {
      toast({ title: "Failed to remove IP ban", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({ ip: "", cidr: "", reason: "", expiresAt: "" });
  };

  const openCreateDialog = () => {
    setFormData({ ip: "", cidr: "", reason: "", expiresAt: "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.ip.trim()) {
      toast({ title: "IP address is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <SectionSkeleton title="IP Bans" />;
  }

  return (
    <div className="space-y-6" data-testid="ip-bans-section">
      <SectionHeader
        title="IP Bans"
        description="Manage blocked IP addresses and ranges"
        actions={
          <Button onClick={openCreateDialog} data-testid="button-add-ip-ban">
            <Plus className="h-4 w-4 mr-2" />
            Add IP Ban
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search IP addresses..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-ip-bans"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          data-testid="button-refresh-ip-bans"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">
                    IP Address
                  </th>
                  <th className="text-left p-4 font-medium text-sm">CIDR</th>
                  <th className="text-left p-4 font-medium text-sm">Reason</th>
                  <th className="text-left p-4 font-medium text-sm">Created</th>
                  <th className="text-left p-4 font-medium text-sm">Expires</th>
                  <th className="text-right p-4 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {ipBans?.data?.map((ban) => (
                  <tr
                    key={ban.id}
                    className="border-b last:border-0"
                    data-testid={`ip-ban-row-${ban.id}`}
                  >
                    <td className="p-4">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {ban.ip}
                      </code>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {ban.cidr ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {ban.cidr}
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-sm max-w-xs truncate">
                      {ban.reason || "—"}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(ban.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="p-4 text-sm">
                      {ban.expiresAt ? (
                        <span
                          className={
                            new Date(ban.expiresAt) < new Date()
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }
                        >
                          {format(new Date(ban.expiresAt), "MMM d, yyyy HH:mm")}
                        </span>
                      ) : (
                        <Badge variant="secondary">Permanent</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-ip-ban-actions-${ban.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(ban.id)}
                            className="text-destructive"
                            data-testid={`button-delete-ip-ban-${ban.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Ban
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!ipBans?.data || ipBans.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No IP bans found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={ipBans?.totalPages || 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add IP Ban</DialogTitle>
            <DialogDescription>
              Block an IP address or range from accessing the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ban-ip">IP Address *</Label>
              <Input
                id="ban-ip"
                value={formData.ip}
                onChange={(e) =>
                  setFormData({ ...formData, ip: e.target.value })
                }
                placeholder="192.168.1.1"
                data-testid="input-ban-ip"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-cidr">CIDR Range (optional)</Label>
              <Input
                id="ban-cidr"
                value={formData.cidr}
                onChange={(e) =>
                  setFormData({ ...formData, cidr: e.target.value })
                }
                placeholder="192.168.1.0/24"
                data-testid="input-ban-cidr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason</Label>
              <Textarea
                id="ban-reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Reason for banning this IP..."
                data-testid="input-ban-reason"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-expires">Expires At (optional)</Label>
              <Input
                id="ban-expires"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                data-testid="input-ban-expires"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.ip.trim() || createMutation.isPending}
              data-testid="button-save-ip-ban"
            >
              {createMutation.isPending ? "Creating..." : "Create Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecuritySection() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  const { data: securityStats } = useQuery<SecurityStats>({
    queryKey: ["/api/admin/security/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/security/stats");
      return res.json();
    },
  });

  const { data: securityAnalytics } = useQuery<SecurityAnalytics>({
    queryKey: ["/api/admin/security/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/security/analytics");
      return res.json();
    },
  });

  const { data: sessionAnalytics } = useQuery<SessionAnalytics>({
    queryKey: ["/api/admin/sessions/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sessions/analytics");
      return res.json();
    },
  });

  const { data: recentAuditLogs } = useQuery<PaginatedResult<AuditLogEntry>>({
    queryKey: ["/api/admin/audit-logs", { page: 1, limit: 5 }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        "/api/admin/audit-logs?page=1&limit=5",
      );
      return res.json();
    },
  });

  return (
    <div className="space-y-6" data-testid="security-section">
      <SectionHeader
        title="Security Overview"
        description="Monitor platform security and access controls"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {securityStats?.activeSessionCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active Sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Ban className="h-4 w-4 text-red-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats?.ipBanCount || 0}</p>
            <p className="text-xs text-muted-foreground">IP Bans</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <FileText className="h-4 w-4 text-green-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{recentAuditLogs?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Audit Logs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-yellow-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {securityAnalytics?.suspiciousActivity?.length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Suspicious IPs</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Activity Last 24 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {securityAnalytics?.hourlyActivity &&
            securityAnalytics.hourlyActivity.length > 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 24 }, (_, i) => {
                  const hourData = securityAnalytics.hourlyActivity.find(
                    (h) => parseInt(h.hour) === i,
                  );
                  const count = hourData?.count || 0;
                  const maxCount = Math.max(
                    ...securityAnalytics.hourlyActivity.map((h) => h.count),
                  );
                  const percentage =
                    maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-8">
                        {i.toString().padStart(2, "0")}:00
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Top Actions (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {securityAnalytics?.topActions &&
            securityAnalytics.topActions.length > 0 ? (
              <div className="space-y-3">
                {securityAnalytics.topActions
                  .slice(0, 5)
                  .map((action, index) => {
                    const maxCount =
                      securityAnalytics.topActions[0]?.count || 1;
                    const percentage = (action.count / maxCount) * 100;

                    return (
                      <div key={action.actionType} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">
                            {action.actionType
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                          <span className="text-muted-foreground">
                            {action.count}
                          </span>
                        </div>
                        <div className="bg-muted rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No action data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top IPs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Top IP Addresses (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {securityAnalytics?.topIPs &&
            securityAnalytics.topIPs.length > 0 ? (
              <div className="space-y-2">
                {securityAnalytics.topIPs.slice(0, 5).map((ipData) => (
                  <div
                    key={ipData.ip}
                    className="flex justify-between items-center text-sm"
                  >
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                      {ipData.ip}
                    </code>
                    <Badge variant="secondary">{ipData.count} actions</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No IP data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Suspicious Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-500" />
              Suspicious Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {securityAnalytics?.suspiciousActivity &&
            securityAnalytics.suspiciousActivity.length > 0 ? (
              <div className="space-y-3">
                {securityAnalytics.suspiciousActivity.map((activity) => (
                  <div
                    key={activity.ip}
                    className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <code className="text-sm font-mono bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                          {activity.ip}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.actionCount} actions from{" "}
                          {activity.uniqueAdmins} admin(s)
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        High Activity
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <ShieldCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No suspicious activity detected
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Session Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active:</span>
                <span className="text-sm font-medium">
                  {securityStats?.activeSessionCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-sm font-medium">
                  {securityStats?.totalSessionCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expired:</span>
                <span className="text-sm font-medium">
                  {securityStats?.expiredSessionCount || 0}
                </span>
              </div>

              {sessionAnalytics?.expirationStats && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Expiration Timeline:
                  </p>
                  {sessionAnalytics.expirationStats.map((stat) => (
                    <div
                      key={stat.timeToExpire}
                      className="flex justify-between text-xs"
                    >
                      <span className="capitalize">
                        {stat.timeToExpire.replace(/_/g, " ")}:
                      </span>
                      <span>{stat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAuditLogs?.data && recentAuditLogs.data.length > 0 ? (
              <div className="space-y-2">
                {recentAuditLogs.data.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {log.actionType
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2
          className="text-3xl font-bold tracking-tight"
          data-testid={`section-title-${title.toLowerCase()}`}
        >
          {title}
        </h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <SectionHeader title={title} description="Loading..." />
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading data...
        </CardContent>
      </Card>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        data-testid="button-prev-page"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground px-4">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        data-testid="button-next-page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
