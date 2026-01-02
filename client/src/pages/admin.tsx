import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Building2, Shield, FileText, Upload, Activity, Ban, Trash2, RotateCcw, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface DashboardStats {
  userCount: number;
  projectCount: number;
  bannedUserCount: number;
  ipBanCount: number;
  recentImports: any[];
  recentAuditLogs: any[];
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    enabled: user?.role === "admin",
    retry: false,
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-admin">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" data-testid="admin-login-required">
        <p className="text-muted-foreground">Please log in to access the admin console.</p>
        <Button onClick={() => setLocation("/")} data-testid="button-go-home">Go Home</Button>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" data-testid="admin-access-denied">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
        <Button onClick={() => setLocation("/")} data-testid="button-go-home">Go Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6" data-testid="admin-console">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <p className="text-muted-foreground">Manage projects, users, and security settings</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetchStats()} data-testid="button-refresh-stats">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 mb-6" data-testid="admin-tabs">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="ip-bans" data-testid="tab-ip-bans">IP Bans</TabsTrigger>
          <TabsTrigger value="imports" data-testid="tab-imports">Imports</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab stats={dashboardStats} isLoading={statsLoading} />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </TabsContent>

        <TabsContent value="ip-bans">
          <IpBansTab />
        </TabsContent>

        <TabsContent value="imports">
          <ImportsTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab({ stats, isLoading }: { stats?: DashboardStats; isLoading: boolean }) {
  if (isLoading || !stats) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6" data-testid="dashboard-content">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-user-count">{stats.userCount}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-projects">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-project-count">{stats.projectCount}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-banned">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Banned Users</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-banned-count">{stats.bannedUserCount}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-ip-bans">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">IP Bans</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ip-ban-count">{stats.ipBanCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="recent-activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {stats.recentAuditLogs?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentAuditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between gap-4 text-sm" data-testid={`audit-log-${log.id}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{log.actionType}</Badge>
                      {log.targetType && <span className="text-muted-foreground">{log.targetType}</span>}
                    </div>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectsTab({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (v: string) => void }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const { data: projects, isLoading, refetch } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/admin/projects", page, searchQuery],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/projects/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Project deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
    },
    onError: () => {
      toast({ title: "Failed to delete project", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4" data-testid="projects-tab">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-projects">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading projects...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <table className="w-full">
                <thead className="border-b sticky top-0 bg-card">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Developer</th>
                    <th className="text-left p-3 font-medium">City</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects?.data?.map((project: any) => (
                    <tr key={project.id} className="border-b" data-testid={`project-row-${project.id}`}>
                      <td className="p-3">{project.name}</td>
                      <td className="p-3">{project.developer?.name}</td>
                      <td className="p-3">{project.city?.name}</td>
                      <td className="p-3">
                        <Badge variant={project.deletedAt ? "destructive" : "secondary"}>
                          {project.deletedAt ? "Deleted" : "Active"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} data-testid={`button-delete-project-${project.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.name}"? This action can be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(project.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsersTab({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (v: string) => void }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const { data: users, isLoading, refetch } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/admin/users", page, searchQuery],
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await apiRequest("POST", `/api/admin/users/${id}/ban`, { reason });
    },
    onSuccess: () => {
      toast({ title: "User banned" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/users/${id}/unban`);
    },
    onSuccess: () => {
      toast({ title: "User unbanned" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to unban user", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4" data-testid="users-tab">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-users">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading users...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <table className="w-full">
                <thead className="border-b sticky top-0 bg-card">
                  <tr>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.data?.map((user: any) => (
                    <tr key={user.id} className="border-b" data-testid={`user-row-${user.id}`}>
                      <td className="p-3">{user.email || "N/A"}</td>
                      <td className="p-3">{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A"}</td>
                      <td className="p-3">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={user.bannedAt ? "destructive" : "outline"}>
                          {user.bannedAt ? "Banned" : "Active"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {user.bannedAt ? (
                          <Button variant="ghost" size="sm" onClick={() => unbanMutation.mutate(user.id)} disabled={unbanMutation.isPending} data-testid={`button-unban-user-${user.id}`}>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={banMutation.isPending} data-testid={`button-ban-user-${user.id}`}>
                                <Ban className="h-4 w-4 mr-1" />
                                Ban
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Ban User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to ban this user? They will not be able to access protected features.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => banMutation.mutate({ id: user.id })}>Ban</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IpBansTab() {
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");

  const { data: ipBans, isLoading, refetch } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/admin/ip-bans"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/ip-bans", { ip: newIp, reason: newReason || undefined });
    },
    onSuccess: () => {
      toast({ title: "IP banned" });
      setNewIp("");
      setNewReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ip-bans"] });
    },
    onError: () => {
      toast({ title: "Failed to ban IP", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/ip-bans/${id}`);
    },
    onSuccess: () => {
      toast({ title: "IP ban removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ip-bans"] });
    },
    onError: () => {
      toast({ title: "Failed to remove ban", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4" data-testid="ip-bans-tab">
      <Card>
        <CardHeader>
          <CardTitle>Add IP Ban</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Input
            placeholder="IP Address (e.g., 192.168.1.1)"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="flex-1 min-w-48"
            data-testid="input-ban-ip"
          />
          <Input
            placeholder="Reason (optional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="flex-1 min-w-48"
            data-testid="input-ban-reason"
          />
          <Button onClick={() => addMutation.mutate()} disabled={!newIp || addMutation.isPending} data-testid="button-add-ip-ban">
            Add Ban
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading IP bans...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <table className="w-full">
                <thead className="border-b sticky top-0 bg-card">
                  <tr>
                    <th className="text-left p-3 font-medium">IP Address</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Expires</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ipBans?.data?.map((ban: any) => (
                    <tr key={ban.id} className="border-b" data-testid={`ip-ban-row-${ban.id}`}>
                      <td className="p-3 font-mono text-sm">{ban.ip}</td>
                      <td className="p-3">{ban.reason || "N/A"}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(ban.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {ban.expiresAt ? format(new Date(ban.expiresAt), "MMM d, yyyy") : "Never"}
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ban.id)} disabled={deleteMutation.isPending} data-testid={`button-remove-ip-ban-${ban.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {ipBans?.data?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">No IP bans</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ImportsTab() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const { data: imports, isLoading, refetch } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/admin/imports"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      
      const csrfCookie = document.cookie.split(";").find(c => c.trim().startsWith("_csrf="));
      const csrfToken = csrfCookie?.split("=")[1] || "";
      
      const response = await fetch("/api/admin/projects/import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Import started" });
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/imports"] });
    },
    onError: () => {
      toast({ title: "Failed to start import", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4" data-testid="imports-tab">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Projects from CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1"
            data-testid="input-csv-file"
          />
          <Button onClick={() => uploadMutation.mutate()} disabled={!file || uploadMutation.isPending} data-testid="button-upload-csv">
            {uploadMutation.isPending ? "Uploading..." : "Upload & Import"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading imports...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Import History</span>
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-imports">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <table className="w-full">
                <thead className="border-b sticky top-0 bg-card">
                  <tr>
                    <th className="text-left p-3 font-medium">Filename</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Progress</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {imports?.data?.map((job: any) => (
                    <tr key={job.id} className="border-b" data-testid={`import-row-${job.id}`}>
                      <td className="p-3">{job.filename}</td>
                      <td className="p-3">
                        <Badge variant={
                          job.status === "completed" ? "default" :
                          job.status === "failed" ? "destructive" : "secondary"
                        }>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        {job.insertedCount || 0} added, {job.failedCount || 0} failed
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(job.createdAt), "MMM d, h:mm a")}
                      </td>
                    </tr>
                  ))}
                  {imports?.data?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted-foreground">No imports yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [actionType, setActionType] = useState("");

  const { data: logs, isLoading, refetch } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/admin/audit-logs", page, userId, actionType],
  });

  return (
    <div className="space-y-4" data-testid="audit-log-tab">
      <Card>
        <CardHeader>
          <CardTitle>Filter Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium mb-1 block">Admin/User ID</label>
            <Input
              placeholder="Filter by User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              data-testid="input-filter-userid"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium mb-1 block">Action Type</label>
            <Input
              placeholder="e.g. user_ban, project_delete"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              data-testid="input-filter-action"
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-audit">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading audit logs...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <table className="w-full">
                <thead className="border-b sticky top-0 bg-card">
                  <tr>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Target</th>
                    <th className="text-left p-3 font-medium">User ID</th>
                    <th className="text-left p-3 font-medium">IP</th>
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs?.data?.map((log: any) => (
                    <tr key={log.id} className="border-b" data-testid={`audit-row-${log.id}`}>
                      <td className="p-3">
                        <Badge variant="outline">{log.actionType}</Badge>
                      </td>
                      <td className="p-3 text-sm">{log.targetType} {log.targetId}</td>
                      <td className="p-3 text-sm font-mono truncate max-w-32">{log.adminId}</td>
                      <td className="p-3 text-sm font-mono">{log.ip || "N/A"}</td>
                      <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "MMM d, h:mm a")}
                      </td>
                      <td className="p-3">
                        {log.metadataJson && (
                          <div className="text-xs text-muted-foreground max-w-48 truncate" title={JSON.stringify(log.metadataJson)}>
                            {JSON.stringify(log.metadataJson)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs?.data?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-muted-foreground">No audit logs found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
