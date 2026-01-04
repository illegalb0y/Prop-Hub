import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

type AdminSection = "dashboard" | "users" | "projects" | "developers" | "banks";

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
  projectCount?: number;
}

interface Bank {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
}

interface Project {
  id: number;
  name: string;
  developerId: number;
  cityId: number;
  districtId: number;
  address: string | null;
  shortDescription: string | null;
  priceFrom: string | null;
  currency: string | null;
  deletedAt: string | null;
}

const navigationItems = [
  {
    section: "Product Analytics",
    items: [
      { id: "dashboard" as AdminSection, label: "Dashboard", icon: LayoutDashboard },
      { id: "users" as AdminSection, label: "Users", icon: Users },
    ],
  },
  {
    section: "Data",
    items: [
      { id: "projects" as AdminSection, label: "Projects", icon: FolderKanban },
      { id: "developers" as AdminSection, label: "Developers", icon: Building2 },
      { id: "banks" as AdminSection, label: "Banks", icon: Landmark },
    ],
  },
];

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="admin-loading">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="flex h-full" data-testid="admin-page">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-6 max-w-[1400px] mx-auto">
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "users" && <UsersSection />}
          {activeSection === "projects" && <ProjectsSection />}
          {activeSection === "developers" && <DevelopersSection />}
          {activeSection === "banks" && <BanksSection />}
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
    <aside className="w-64 border-r bg-sidebar flex flex-col" data-testid="admin-sidebar">
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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  if (isLoading) {
    return <SectionSkeleton title="Dashboard" />;
  }

  const kpiCards = [
    { label: "Total Users", value: stats?.userCount || 0, icon: Users, color: "text-blue-500" },
    { label: "Total Projects", value: stats?.projectCount || 0, icon: FolderKanban, color: "text-green-500" },
    { label: "Developers", value: stats?.developerCount || 0, icon: Building2, color: "text-purple-500" },
    { label: "Banks", value: stats?.bankCount || 0, icon: Landmark, color: "text-orange-500" },
    { label: "Banned Users", value: stats?.bannedUserCount || 0, icon: Ban, color: "text-red-500" },
    { label: "IP Bans", value: stats?.ipBanCount || 0, icon: ShieldCheck, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-section">
      <SectionHeader title="Dashboard" description="Overview of your platform's key metrics" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{kpi.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Imports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentImports && stats.recentImports.length > 0 ? (
              <div className="space-y-3">
                {stats.recentImports.map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 text-sm"
                    data-testid={`import-${job.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{job.filename}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
                            : job.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {job.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(job.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent imports</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickExportButton entity="projects" label="Export Projects" />
            <QuickExportButton entity="developers" label="Export Developers" />
            <QuickExportButton entity="banks" label="Export Banks" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickExportButton({ entity, label }: { entity: string; label: string }) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/${entity}/export`, { credentials: "include" });
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

  const { data: users, isLoading, refetch } = useQuery<PaginatedResult<User>>({
    queryKey: ["/api/admin/users", { page, search }],
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
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
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role: "admin" });
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
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role: "user" });
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
      <SectionHeader title="Users" description="Manage user accounts and permissions" />

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
        <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-users">
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
                  <th className="text-right p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.data?.map((user) => (
                  <tr key={user.id} className="border-b last:border-0" data-testid={`user-row-${user.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl || undefined} />
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
                    <td className="p-4 text-sm text-muted-foreground">{user.email || "—"}</td>
                    <td className="p-4">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.bannedAt ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
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
                              onClick={() => demoteFromAdminMutation.mutate(user.id)}
                              data-testid={`button-demote-${user.id}`}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Demote from Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => promoteToAdminMutation.mutate(user.id)}
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
              Ban {selectedUser?.email || "this user"} from accessing the platform.
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
              onClick={() => selectedUser && banMutation.mutate({ userId: selectedUser.id, reason: banReason })}
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
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: projects, isLoading, refetch } = useQuery<PaginatedResult<Project>>({
    queryKey: ["/api/admin/projects", { page, search }],
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

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) return;
      const formData = new FormData();
      formData.append("file", importFile);
      const csrfCookie = document.cookie.split(";").find((c) => c.trim().startsWith("_csrf="));
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
    onSuccess: () => {
      toast({ title: "Import started successfully" });
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/projects/export", { credentials: "include" });
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

  if (isLoading) {
    return <SectionSkeleton title="Projects" />;
  }

  return (
    <div className="space-y-6" data-testid="projects-section">
      <SectionHeader 
        title="Projects" 
        description="Manage real estate projects"
        actions={
          <Button onClick={() => {}} data-testid="button-add-project">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} data-testid="button-export-projects">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 w-48"
              data-testid="input-import-projects"
            />
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              data-testid="button-import-projects"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-projects">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">ID</th>
                  <th className="text-left p-4 font-medium text-sm">Name</th>
                  <th className="text-left p-4 font-medium text-sm">Price</th>
                  <th className="text-left p-4 font-medium text-sm">Status</th>
                  <th className="text-right p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects?.data?.map((project) => (
                  <tr key={project.id} className="border-b last:border-0" data-testid={`project-row-${project.id}`}>
                    <td className="p-4 text-sm text-muted-foreground">#{project.id}</td>
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
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-project-actions-${project.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No projects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={projects?.totalPages || 1} onPageChange={setPage} />
    </div>
  );
}

function DevelopersSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [formData, setFormData] = useState({ name: "", logoUrl: "", description: "" });
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: developers, isLoading, refetch } = useQuery<PaginatedResult<Developer>>({
    queryKey: ["/api/admin/developers", { page, search }],
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

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) return;
      const formData = new FormData();
      formData.append("file", importFile);
      const csrfCookie = document.cookie.split(";").find((c) => c.trim().startsWith("_csrf="));
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
    onSuccess: () => {
      toast({ title: "Import started successfully" });
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/developers"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
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
      const response = await fetch("/api/admin/developers/export", { credentials: "include" });
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} data-testid="button-export-developers">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 w-48"
              data-testid="input-import-developers"
            />
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              data-testid="button-import-developers"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-developers">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Developer</th>
                  <th className="text-left p-4 font-medium text-sm">Description</th>
                  <th className="text-left p-4 font-medium text-sm">Projects</th>
                  <th className="text-right p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {developers?.data?.map((developer) => (
                  <tr key={developer.id} className="border-b last:border-0" data-testid={`developer-row-${developer.id}`}>
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
                      <Badge variant="secondary">{developer.projectCount || 0} projects</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-developer-actions-${developer.id}`}>
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
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(developer.id)}
                            className="text-destructive"
                            data-testid={`button-delete-developer-${developer.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!developers?.data || developers.data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No developers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={developers?.totalPages || 1} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeveloper ? "Edit Developer" : "Add Developer"}</DialogTitle>
            <DialogDescription>
              {editingDeveloper ? "Update developer details" : "Create a new property developer"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dev-name">Name</Label>
              <Input
                id="dev-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Developer name"
                data-testid="input-developer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-logo">Logo URL</Label>
              <Input
                id="dev-logo"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-developer-logo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-desc">Description</Label>
              <Textarea
                id="dev-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
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
    </div>
  );
}

function BanksSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({ name: "", logoUrl: "", description: "" });
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: banks, isLoading, refetch } = useQuery<PaginatedResult<Bank>>({
    queryKey: ["/api/admin/banks", { page, search }],
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

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) return;
      const formData = new FormData();
      formData.append("file", importFile);
      const csrfCookie = document.cookie.split(";").find((c) => c.trim().startsWith("_csrf="));
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
    onSuccess: () => {
      toast({ title: "Import started successfully" });
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBank(null);
    setFormData({ name: "", logoUrl: "", description: "" });
  };

  const openCreateDialog = () => {
    setEditingBank(null);
    setFormData({ name: "", logoUrl: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      logoUrl: bank.logoUrl || "",
      description: bank.description || "",
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
      const response = await fetch("/api/admin/banks/export", { credentials: "include" });
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} data-testid="button-export-banks">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 w-48"
              data-testid="input-import-banks"
            />
            <Button
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              data-testid="button-import-banks"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-banks">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Bank</th>
                  <th className="text-left p-4 font-medium text-sm">Description</th>
                  <th className="text-right p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banks?.data?.map((bank) => (
                  <tr key={bank.id} className="border-b last:border-0" data-testid={`bank-row-${bank.id}`}>
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
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-bank-actions-${bank.id}`}>
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
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(bank.id)}
                            className="text-destructive"
                            data-testid={`button-delete-bank-${bank.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!banks?.data || banks.data.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No banks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={banks?.totalPages || 1} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Bank" : "Add Bank"}</DialogTitle>
            <DialogDescription>
              {editingBank ? "Update bank details" : "Create a new partner bank"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Name</Label>
              <Input
                id="bank-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Bank name"
                data-testid="input-bank-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-logo">Logo URL</Label>
              <Input
                id="bank-logo"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-bank-logo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-desc">Description</Label>
              <Textarea
                id="bank-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                data-testid="input-bank-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
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
    </div>
  );
}

function SectionHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight" data-testid={`section-title-${title.toLowerCase()}`}>
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
