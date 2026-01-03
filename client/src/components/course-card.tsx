import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Course, UserProgress } from "@shared/schema";
import { BookOpen, Coins, Users, ChevronRight } from "lucide-react";

interface CourseStats {
  completions: number;
  totalKasPaid: number;
}

interface CourseCardProps {
  course: Course;
  progress?: UserProgress;
  stats?: CourseStats;
}

export function CourseCard({ course, progress, stats }: CourseCardProps) {
  const completedCount = progress?.completedLessons?.length ?? 0;
  const progressPercent = Math.round((completedCount / course.lessonCount) * 100);
  const isStarted = completedCount > 0;
  const isCompleted = progressPercent === 100;

  const difficultyColors = {
    beginner: "bg-green-500/10 text-green-500 border-green-500/20",
    intermediate: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    advanced: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <Link href={`/courses/${course.id}`}>
      <Card
        className="group cursor-pointer overflow-visible border-border/50 transition-all hover:border-primary/30"
        data-testid={`card-course-${course.id}`}
      >
        <CardContent className="p-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/20 via-accent/10 to-background">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-primary/40" />
              </div>
            )}
            <div className="absolute right-3 top-3">
              <Badge
                variant="outline"
                className={`${difficultyColors[course.difficulty]} text-xs capitalize`}
              >
                {course.difficulty}
              </Badge>
            </div>
            {isCompleted && (
              <div className="absolute left-3 top-3">
                <Badge className="bg-primary text-primary-foreground">Completed</Badge>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-primary">
                {course.title}
              </h3>
            </div>

            <p className="line-clamp-2 text-sm text-muted-foreground">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{course.lessonCount} lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-primary">+{course.kasReward} KAS</span>
              </div>
              {stats && (
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{stats.completions} completed</span>
                </div>
              )}
            </div>
            {stats && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coins className="h-3 w-3" />
                <span>{stats.totalKasPaid.toFixed(1)} KAS distributed</span>
              </div>
            )}

            {isStarted && !isCompleted && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}

            <Button
              variant={isStarted ? "default" : "outline"}
              className="mt-1 w-full gap-2"
            >
              {isCompleted ? "Review Course" : isStarted ? "Continue Learning" : "Start Course"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
