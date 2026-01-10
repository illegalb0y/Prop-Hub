import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { ProjectWithRelations } from "@shared/schema";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [searchValue, setSearchValue] = useState("");

  const { data: projects = [] } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects"],
  });

  // Фильтрация проектов по поисковому запросу
  const filteredProjects = useMemo(() => {
    if (!searchValue.trim()) return [];

    const query = searchValue.toLowerCase();

    return projects
      .filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.shortDescription?.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query) ||
          project.address?.toLowerCase().includes(query) ||
          project.developer.name.toLowerCase().includes(query) ||
          project.city.name.toLowerCase().includes(query) ||
          project.district.name.toLowerCase().includes(query)
      )
      .slice(0, 10); // Ограничиваем до 10 результатов
  }, [projects, searchValue]);

  // Форматирование цены
  const formatPrice = (price: number | null, currency: string = "USD") => {
    if (!price) return t("common.noResults");

    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Обработчик выбора проекта
  const handleSelectProject = (projectId: number) => {
    navigate(`/projects/${projectId}`);
    onOpenChange(false);
    setSearchValue("");
  };

  // Сброс поиска при закрытии
  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t("search.placeholder")}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>{t("search.noResults")}</CommandEmpty>
        {filteredProjects.length > 0 && (
          <CommandGroup heading={t("projects.title")}>
            {filteredProjects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => handleSelectProject(project.id)}
                className="flex items-center gap-3 py-3 cursor-pointer"
              >
                <img
                  src={project.coverImageUrl || "/placeholder.svg"}
                  alt={project.name}
                  className="h-12 w-12 rounded object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("projects.priceFrom")} {formatPrice(project.priceFrom, project.currency)}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
