import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Search,
  RefreshCw,
  MoreHorizontal,
  Eye,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Типы данных
interface ImportJob {
  id: string;
  filename: string;
  entityType: string;
  status: "pending" | "completed" | "failed" | "undone";
  totalRows: string | null;
  insertedCount: string | null;
  updatedCount: string | null;
  failedCount: string | null;
  createdRecordIds: number[] | null;
  undoneAt: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ImportJobError {
  id: string;
  importJobId: string;
  rowNumber: string | null;
  errorMessage: string | null;
  rawRowJson: any;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Компонент для отображения статуса импорта
function ImportStatusBadge({ status }: { status: ImportJob["status"] }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <X className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case "undone":
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <RotateCcw className="h-3 w-3 mr-1" />
          Undone
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Компонент для отображения типа сущности
function EntityTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "projects":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Projects
        </Badge>
      );
    case "developers":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Developers
        </Badge>
      );
    case "banks":
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
          Banks
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

// Основной компонент раздела
export default function ImportLogsSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedImport, setSelectedImport] = useState<ImportJob | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Запрос на получение списка импортов
  const {
    data: imports,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<ImportJob>>({
    queryKey: ["/api/admin/imports", { page, search, entityTypeFilter, statusFilter }],
    queryFn: async ({ queryKey }) => {
      const [_base, params] = queryKey as [
        string,
        { page: number; search: string; entityTypeFilter: string; statusFilter: string }
      ];
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: "10",
      });

      if (params.search) searchParams.append("search", params.search);
      if (params.entityTypeFilter && params.entityTypeFilter !== "all") {
        searchParams.append("entityType", params.entityTypeFilter);
      }
      if (params.statusFilter && params.statusFilter !== "all") {
        searchParams.append("status", params.statusFilter);
      }

      const res = await apiRequest(
        "GET",
        `/api/admin/imports?${searchParams.toString()}`
      );
      return res.json();
    },
  });

  // Запрос на получение ошибок импорта
  const {
    data: importErrors,
    isLoading: isLoadingErrors,
  } = useQuery<ImportJobError[]>({
    queryKey: ["/api/admin/imports/errors", selectedImport?.id],
    queryFn: async ({ queryKey }) => {
      const [_base, importId] = queryKey as [string, string | undefined];
      if (!importId) return [];
      const res = await apiRequest("GET", `/api/admin/imports/${importId}/errors`);
      return res.json();
    },
    enabled: !!selectedImport?.id,
  });

  // Мутация для отмены импорта
  const undoImportMutation = useMutation({
    mutationFn: async (importId: string) => {
      return apiRequest("POST", `/api/admin/imports/${importId}/undo`);
    },
    onSuccess: () => {
      toast({ title: "Import successfully undone" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/imports"] });
      setDetailsOpen(false);
      setSelectedImport(null);
    },
    onError: () => {
      toast({ title: "Failed to undo import", variant: "destructive" });
    },
  });

  // Обработчик для просмотра деталей импорта
  const handleViewDetails = (importJob: ImportJob) => {
    setSelectedImport(importJob);
    setDetailsOpen(true);
  };

  // Обработчик для отмены импорта
  const handleUndoImport = () => {
    if (selectedImport) {
      undoImportMutation.mutate(selectedImport.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Data Import Logs</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            View and manage all data imports including projects, developers, and banks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Фильтры */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select
              value={entityTypeFilter}
              onValueChange={(value) => setEntityTypeFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
                <SelectItem value="developers">Developers</SelectItem>
                <SelectItem value="banks">Banks</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="undone">Undone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Таблица импортов */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Inserted</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : imports?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No import logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  imports?.data.map((importJob) => (
                    <TableRow key={importJob.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(importJob)}>
                      <TableCell className="font-medium">{importJob.filename}</TableCell>
                      <TableCell>
                        <EntityTypeBadge type={importJob.entityType} />
                      </TableCell>
                      <TableCell>
                        <ImportStatusBadge status={importJob.status} />
                      </TableCell>
                      <TableCell>{importJob.totalRows || "-"}</TableCell>
                      <TableCell>{importJob.insertedCount || "-"}</TableCell>
                      <TableCell>{importJob.failedCount || "-"}</TableCell>
                      <TableCell>
                        {importJob.createdAt
                          ? format(new Date(importJob.createdAt), "dd MMM yyyy, HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {importJob.completedAt
                          ? format(new Date(importJob.completedAt), "dd MMM yyyy, HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(importJob);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {importJob.status === "completed" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImport(importJob);
                                  handleUndoImport();
                                }}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Undo Import
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Пагинация */}
          {imports && imports.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * imports.limit + 1} to{" "}
                {Math.min(page * imports.limit, imports.total)} of {imports.total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === imports.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно с деталями импорта */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected import job.
            </DialogDescription>
          </DialogHeader>

          {selectedImport && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="errors">
                  Errors {importErrors?.length ? `(${importErrors.length})` : ""}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID</p>
                    <p>{selectedImport.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Filename</p>
                    <p>{selectedImport.filename}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Entity Type</p>
                    <p><EntityTypeBadge type={selectedImport.entityType} /></p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p><ImportStatusBadge status={selectedImport.status} /></p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Rows</p>
                    <p>{selectedImport.totalRows || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Inserted Count</p>
                    <p>{selectedImport.insertedCount || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Updated Count</p>
                    <p>{selectedImport.updatedCount || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Failed Count</p>
                    <p>{selectedImport.failedCount || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p>
                      {selectedImport.createdAt
                        ? format(new Date(selectedImport.createdAt), "dd MMM yyyy, HH:mm:ss")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                    <p>
                      {selectedImport.completedAt
                        ? format(new Date(selectedImport.completedAt), "dd MMM yyyy, HH:mm:ss")
                        : "-"}
                    </p>
                  </div>
                  {selectedImport.undoneAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Undone At</p>
                      <p>
                        {format(new Date(selectedImport.undoneAt), "dd MMM yyyy, HH:mm:ss")}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="errors">
                {isLoadingErrors ? (
                  <div className="py-4 text-center">Loading errors...</div>
                ) : !importErrors?.length ? (
                  <div className="py-4 text-center">No errors found for this import.</div>
                ) : (
                  <ScrollArea className="h-[400px] mt-4">
                    <div className="space-y-4">
                      {importErrors.map((error) => (
                        <Card key={error.id}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">
                                Row {error.rowNumber || "Unknown"}
                              </CardTitle>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-sm font-medium text-muted-foreground">Error Message</p>
                            <p className="text-sm text-red-500">{error.errorMessage}</p>

                            {error.rawRowJson && (
                              <>
                                <p className="text-sm font-medium text-muted-foreground mt-2">Row Data</p>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
                                  {JSON.stringify(error.rawRowJson, null, 2)}
                                </pre>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            {selectedImport?.status === "completed" && (
              <Button
                variant="destructive"
                onClick={handleUndoImport}
                disabled={undoImportMutation.isPending}
              >
                {undoImportMutation.isPending ? "Undoing..." : "Undo Import"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
