import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Activity,
  TrendingUp,
  Globe,
  Monitor,
  Download,
  RefreshCw,
  Calendar,
  Smartphone,
  Tablet,
  Chrome,
  Apple,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Funnel,
  FunnelChart,
  LabelList,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type AnalyticsPeriod = "day" | "week" | "month" | "quarter" | "year";
type UserType = "all" | "authenticated" | "anonymous";

interface AnalyticsOverview {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersThisMonth: number;
  totalSessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  newUsersToday: number;
  returningUsers: number;
}

interface DAUMAUData {
  date: string;
  dau: number;
  mau: number;
  dauMauRatio: number;
}

interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  day1: number;
  day7: number;
  day14: number;
  day30: number;
}

interface ConversionFunnelStep {
  step: string;
  count: number;
  percentage: number;
}

interface GeoData {
  country: string;
  countryCode: string;
  sessions: number;
  users: number;
}

interface DeviceData {
  deviceType: string;
  count: number;
  percentage: number;
}

interface BrowserData {
  browser: string;
  count: number;
  percentage: number;
}

interface OSData {
  os: string;
  count: number;
  percentage: number;
}

interface TrafficSource {
  source: string;
  sessions: number;
  users: number;
  percentage: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const countryCoordinates: Record<string, [number, number]> = {
  US: [37.0902, -95.7129],
  GB: [55.3781, -3.436],
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  CA: [56.1304, -106.3468],
  AU: [-25.2744, 133.7751],
  RU: [61.524, 105.3188],
  BR: [-14.235, -51.9253],
  JP: [36.2048, 138.2529],
  IN: [20.5937, 78.9629],
};

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [userType, setUserType] = useState<UserType>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/admin/analytics/overview", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/overview?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: dauMau, isLoading: dauMauLoading, refetch: refetchDauMau } = useQuery<DAUMAUData[]>({
    queryKey: ["/api/admin/analytics/dau-mau", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/dau-mau?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: retention } = useQuery<RetentionCohort[]>({
    queryKey: ["/api/admin/analytics/retention", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/retention?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: funnel } = useQuery<ConversionFunnelStep[]>({
    queryKey: ["/api/admin/analytics/funnel", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/funnel?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: geoData, isLoading: geoLoading } = useQuery<GeoData[]>({
    queryKey: ["/api/admin/analytics/geo", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/geo?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: deviceData } = useQuery<DeviceData[]>({
    queryKey: ["/api/admin/analytics/devices", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/devices?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: browserData } = useQuery<BrowserData[]>({
    queryKey: ["/api/admin/analytics/browsers", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/browsers?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: osData } = useQuery<OSData[]>({
    queryKey: ["/api/admin/analytics/os", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/os?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const { data: trafficSources } = useQuery<TrafficSource[]>({
    queryKey: ["/api/admin/analytics/traffic-sources", period, userType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/traffic-sources?period=${period}&userType=${userType}`);
      return res.json();
    },
  });

  const handleRefresh = () => {
    refetchOverview();
    refetchDauMau();
    queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await apiRequest("POST", "/api/admin/analytics/seed");
      toast({ title: "Analytics data seeded successfully" });
      handleRefresh();
    } catch (error) {
      toast({ title: "Failed to seed data", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await apiRequest("GET", `/api/admin/analytics/export?period=${period}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${period}-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Analytics data exported successfully" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const stickiness = useMemo(() => {
    if (!dauMau || dauMau.length === 0) return 0;
    const latest = dauMau[dauMau.length - 1];
    return latest.mau > 0 ? Math.round((latest.dau / latest.mau) * 100) : 0;
  }, [dauMau]);

  const periodLabels: Record<AnalyticsPeriod, string> = {
    day: "Last 24 Hours",
    week: "Last 7 Days",
    month: "Last 30 Days",
    quarter: "Last 90 Days",
    year: "Last 365 Days",
  };

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Product Analytics</h2>
          <p className="text-muted-foreground text-sm">User activity, conversions, and platform metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <SelectTrigger className="w-[160px]" data-testid="select-period">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userType} onValueChange={(v) => setUserType(v as UserType)}>
            <SelectTrigger className="w-[180px]" data-testid="select-user-type">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="authenticated">Authenticated</SelectItem>
              <SelectItem value="anonymous">Anonymous</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleSeedData} disabled={isSeeding} data-testid="button-seed">
            {isSeeding ? "Seeding..." : "Seed Data"}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Active Users Today (DAU)"
          value={overview?.activeUsersToday || 0}
          icon={Users}
          testId="kpi-dau"
        />
        <KPICard
          title="Monthly Active Users (MAU)"
          value={overview?.activeUsersThisMonth || 0}
          icon={Activity}
          testId="kpi-mau"
        />
        <KPICard
          title="Stickiness (DAU/MAU)"
          value={`${stickiness}%`}
          icon={TrendingUp}
          testId="kpi-stickiness"
        />
        <KPICard
          title="Total Sessions"
          value={overview?.totalSessions || 0}
          icon={Globe}
          testId="kpi-sessions"
        />
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="activity" data-testid="tab-activity">User Activity</TabsTrigger>
          <TabsTrigger value="funnel" data-testid="tab-funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">Retention</TabsTrigger>
          <TabsTrigger value="geo" data-testid="tab-geo">Geography</TabsTrigger>
          <TabsTrigger value="tech" data-testid="tab-tech">Technical</TabsTrigger>
          <TabsTrigger value="traffic" data-testid="tab-traffic">Traffic Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DAU / MAU Trend</CardTitle>
                <CardDescription>{periodLabels[period]}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {dauMauLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
                  ) : dauMau && dauMau.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dauMau}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => format(new Date(v), "MMM d")} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")} />
                        <Legend />
                        <Area type="monotone" dataKey="dau" name="DAU" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="mau" name="MAU" stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available. Click "Seed Data" to generate sample analytics.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stickiness Ratio (DAU/MAU)</CardTitle>
                <CardDescription>Higher is better - measures user engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {dauMau && dauMau.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dauMau}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => format(new Date(v), "MMM d")} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Stickiness"]} />
                        <Line type="monotone" dataKey="dauMauRatio" name="Stickiness" stroke="#8884d8" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion Funnel</CardTitle>
              <CardDescription>User journey from visit to contact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {funnel && funnel.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="step" type="category" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip formatter={(v: number, name: string) => [v.toLocaleString(), name === "count" ? "Users" : name]} />
                      <Bar dataKey="count" name="Users" fill="#0088FE" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="percentage" position="right" formatter={(v: number) => `${v}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No funnel data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retention Cohorts</CardTitle>
              <CardDescription>User retention over time by signup date</CardDescription>
            </CardHeader>
            <CardContent>
              {retention && retention.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Cohort</th>
                        <th className="text-center p-2">Size</th>
                        <th className="text-center p-2">Day 1</th>
                        <th className="text-center p-2">Day 7</th>
                        <th className="text-center p-2">Day 14</th>
                        <th className="text-center p-2">Day 30</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retention.map((cohort) => (
                        <tr key={cohort.cohortDate} className="border-b">
                          <td className="p-2">{format(new Date(cohort.cohortDate), "MMM d")}</td>
                          <td className="text-center p-2">{cohort.cohortSize}</td>
                          <RetentionCell value={cohort.day1} total={cohort.cohortSize} />
                          <RetentionCell value={cohort.day7} total={cohort.cohortSize} />
                          <RetentionCell value={cohort.day14} total={cohort.cohortSize} />
                          <RetentionCell value={cohort.day30} total={cohort.cohortSize} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">No retention data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geo" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Geographic Distribution</CardTitle>
                <CardDescription>Sessions by country</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] rounded-md overflow-hidden">
                  {geoLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Loading map...</div>
                  ) : (
                    <MapContainer
                      center={[30, 0]}
                      zoom={2}
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {geoData?.map((geo) => {
                        const coords = countryCoordinates[geo.countryCode];
                        if (!coords) return null;
                        return (
                          <CircleMarker
                            key={geo.countryCode}
                            center={coords}
                            radius={Math.min(30, Math.max(5, Math.sqrt(geo.sessions) * 2))}
                            fillColor="#0088FE"
                            fillOpacity={0.6}
                            stroke={false}
                          >
                            <Popup>
                              <strong>{geo.country}</strong>
                              <br />
                              Sessions: {geo.sessions.toLocaleString()}
                              <br />
                              Users: {geo.users.toLocaleString()}
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Countries</CardTitle>
                <CardDescription>Sessions by region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {geoData?.slice(0, 10).map((geo, index) => {
                    const maxSessions = geoData[0]?.sessions || 1;
                    const width = (geo.sessions / maxSessions) * 100;
                    return (
                      <div key={geo.countryCode} className="space-y-1" data-testid={`geo-row-${geo.countryCode}`}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span>{geo.country}</span>
                          </span>
                          <span className="font-medium">{geo.sessions.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tech" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {deviceData && deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deviceData} dataKey="count" nameKey="deviceType" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.deviceType} ${entry.percentage}%`}>
                          {deviceData.map((entry, index) => (
                            <Cell key={entry.deviceType} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Chrome className="h-4 w-4" />
                  Browsers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {browserData && browserData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={browserData} dataKey="count" nameKey="browser" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.browser} ${entry.percentage}%`}>
                          {browserData.map((entry, index) => (
                            <Cell key={entry.browser} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Apple className="h-4 w-4" />
                  Operating Systems
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {osData && osData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={osData} dataKey="count" nameKey="os" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.os} ${entry.percentage}%`}>
                          {osData.map((entry, index) => (
                            <Cell key={entry.os} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traffic Sources</CardTitle>
              <CardDescription>Where your users come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {trafficSources && trafficSources.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trafficSources}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sessions" name="Sessions" fill="#0088FE" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="users" name="Users" fill="#00C49F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No traffic data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, testId }: { title: string; value: number | string; icon: any; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Icon className="h-4 w-4 text-primary" />
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function RetentionCell({ value, total }: { value: number; total: number }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const getColor = (pct: number) => {
    if (pct >= 60) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (pct >= 40) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    if (pct >= 20) return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
    return "bg-red-500/20 text-red-700 dark:text-red-400";
  };
  return (
    <td className={`text-center p-2 ${getColor(percentage)}`}>
      {percentage}%
    </td>
  );
}
