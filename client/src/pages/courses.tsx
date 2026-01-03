import { useQuery } from "@tanstack/react-query";
import { CourseCard } from "@/components/course-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Course, UserProgress } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { Search, BookOpen, Filter } from "lucide-react";
import { useState, useMemo } from "react";

export default function Courses() {
  const { wallet, isDemoMode } = useWallet();
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: !!wallet || isDemoMode,
  });

  const { data: courseStats } = useQuery<Record<string, { completions: number; totalKasPaid: number }>>({
    queryKey: ["/api/courses/stats"],
  });

  const progressMap = useMemo(() => {
    if (!progressList) return new Map<string, UserProgress>();
    return new Map(progressList.map((p) => [p.courseId, p]));
  }, [progressList]);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.description.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty =
        !selectedDifficulty || course.difficulty === selectedDifficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [courses, search, selectedDifficulty]);

  const difficulties = ["beginner", "intermediate", "advanced"];

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-page-title">
                Courses
              </h1>
              <p className="text-muted-foreground">
                Master blockchain technology and earn KAS rewards
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={selectedDifficulty === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDifficulty(null)}
                data-testid="filter-all"
              >
                All
              </Button>
              {difficulties.map((diff) => (
                <Button
                  key={diff}
                  variant={selectedDifficulty === diff ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDifficulty(diff)}
                  className="capitalize"
                  data-testid={`filter-${diff}`}
                >
                  {diff}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {coursesLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border/50">
                <Skeleton className="aspect-video w-full" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={progressMap.get(course.id)}
                stats={courseStats?.[course.id]}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No courses found</h3>
            <p className="mt-2 text-muted-foreground">
              {search
                ? "Try adjusting your search or filters"
                : "Check back later for new courses"}
            </p>
            {search && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setSelectedDifficulty(null);
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
