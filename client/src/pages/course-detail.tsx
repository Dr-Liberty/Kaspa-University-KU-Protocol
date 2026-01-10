import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { QASection } from "@/components/qa-section";
import type { Course, Lesson, UserProgress, QuizQuestion, QuizResult } from "@shared/schema";
import { useWallet } from "@/lib/wallet-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Coins,
  Clock,
  Award,
  Play,
  Lock,
} from "lucide-react";
import { useState, useMemo } from "react";

function QuizSection({
  lessonId,
  courseId,
  onComplete,
  isLastLesson = false,
}: {
  lessonId: string;
  courseId: string;
  onComplete: () => void;
  isLastLesson?: boolean;
}) {
  const [, navigate] = useLocation();
  const { wallet, isDemoMode } = useWallet();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [demoResult, setDemoResult] = useState<{ score: number; passed: boolean } | null>(null);

  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz", lessonId],
  });

  const submitQuiz = useMutation({
    mutationFn: async () => {
      const answerArray = questions?.map((q) => answers[q.id] ?? -1) ?? [];
      console.log("[Quiz] Submitting quiz", { 
        lessonId, 
        answers: answerArray,
        wallet: wallet?.address?.slice(0, 20),
        isDemoMode,
      });
      
      if (!wallet?.address) {
        throw new Error("Wallet not connected. Please refresh and reconnect your wallet.");
      }
      
      try {
        const response = await apiRequest("POST", `/api/quiz/${lessonId}/submit`, {
          lessonId,
          answers: answerArray,
        });
        const data = await response.json();
        console.log("[Quiz] Response received", data);
        return data;
      } catch (err) {
        console.error("[Quiz] Submit error", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/claimable"] });
      if (data.passed) {
        toast({
          title: "Quiz Passed!",
          description: data.courseCompleted 
            ? "Course complete! Your reward is ready to claim."
            : "Great job! Continue to the next lesson.",
        });
      } else {
        toast({
          title: "Quiz Not Passed",
          description: "Review the material and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDemoSubmit = () => {
    if (!questions) return;
    const answerArray = questions.map((q) => answers[q.id] ?? -1);
    let correct = 0;
    questions.forEach((q, i) => {
      if (answerArray[i] === q.correctIndex) {
        correct++;
      }
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;
    setDemoResult({ score, passed });
    setSubmitted(true);
    if (passed) {
      toast({
        title: "Quiz Passed! (Demo)",
        description: "Connect a wallet to earn real KAS rewards.",
      });
    } else {
      toast({
        title: "Quiz Not Passed",
        description: "Review the material and try again.",
        variant: "destructive",
      });
    }
  };

  const allAnswered = questions?.every((q) => answers[q.id] !== undefined);

  if (!wallet && !isDemoMode) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">
            Connect your wallet to take the quiz and earn rewards
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (submitted && (result || demoResult)) {
    const displayResult = result || demoResult;
    const passed = displayResult?.passed ?? false;
    const score = displayResult?.score ?? 0;
    const courseCompleted = (result as any)?.courseCompleted ?? false;
    
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-6 p-6">
          <div className="text-center">
            {passed ? (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">
                  {isDemoMode ? "Great Job! (Demo Mode)" : "Congratulations!"}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  You scored {score}%
                  {!isDemoMode && courseCompleted && (
                    <>
                      {" - "}
                      <span className="font-semibold text-primary">
                        Course reward ready to claim!
                      </span>
                    </>
                  )}
                </p>
                {isDemoMode && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Connect a wallet to earn real KAS rewards and quiz proofs
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
                  <Circle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold">Not Quite</h3>
                <p className="mt-2 text-muted-foreground">
                  You scored {score}%. Review the answers below.
                </p>
              </>
            )}
          </div>

          {/* Show questions with correct/incorrect indicators */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-muted-foreground">Answer Review</h4>
            {((result as any)?.questions || questions)?.map((question: QuizQuestion, qIndex: number) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correctIndex;
              return (
                <div key={question.id} className="space-y-2">
                  <p className="font-medium flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span>{qIndex + 1}. {question.question}</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 ml-7">
                    {question.options.map((option, oIndex) => {
                      const isUserChoice = userAnswer === oIndex;
                      const isCorrectAnswer = question.correctIndex === oIndex;
                      let variant: "default" | "outline" | "secondary" | "destructive" = "outline";
                      let extraClasses = "";
                      
                      if (isCorrectAnswer) {
                        variant = "default";
                        extraClasses = "bg-primary/20 border-primary text-primary hover:bg-primary/20";
                      } else if (isUserChoice && !isCorrectAnswer) {
                        variant = "outline";
                        extraClasses = "border-destructive/50 text-destructive";
                      }
                      
                      return (
                        <div
                          key={oIndex}
                          className={`h-auto justify-start whitespace-normal px-4 py-3 text-left rounded-md border ${extraClasses} ${isCorrectAnswer ? 'font-medium' : ''}`}
                        >
                          {isCorrectAnswer && <span className="text-primary mr-1">Correct:</span>}
                          {option}
                        </div>
                      );
                    })}
                  </div>
                  {question.explanation && (
                    <p className="text-sm text-muted-foreground ml-7 mt-1">
                      {question.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            {passed ? (
              <Button 
                className="gap-2" 
                onClick={() => {
                  if (courseCompleted && isLastLesson) {
                    navigate("/dashboard");
                  } else {
                    onComplete();
                  }
                }} 
                data-testid="button-continue"
              >
                {courseCompleted && isLastLesson ? "View Rewards" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setResult(null);
                  setDemoResult(null);
                  setAnswers({});
                }}
                data-testid="button-retry"
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5 text-primary" />
            Quiz
          </h3>
          <Badge variant="outline" className="gap-1">
            <Coins className="h-3 w-3" />
            Earn KAS
          </Badge>
        </div>

        {questions?.map((question, qIndex) => (
          <div key={question.id} className="space-y-3">
            <p className="font-medium">
              {qIndex + 1}. {question.question}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option, oIndex) => (
                <Button
                  key={oIndex}
                  variant={answers[question.id] === oIndex ? "default" : "outline"}
                  className="h-auto justify-start whitespace-normal px-4 py-3 text-left"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [question.id]: oIndex }))
                  }
                  data-testid={`option-${question.id}-${oIndex}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        ))}

        {isDemoMode && (
          <div className="rounded-md bg-muted/50 p-3 text-center text-sm text-muted-foreground">
            Demo Mode: No KAS rewards or quiz proofs will be issued
          </div>
        )}

        <Button
          className="w-full gap-2"
          disabled={!allAnswered || submitQuiz.isPending}
          onClick={() => isDemoMode ? handleDemoSubmit() : submitQuiz.mutate()}
          data-testid="button-submit-quiz"
        >
          {submitQuiz.isPending ? "Submitting..." : isDemoMode ? "Submit Quiz (Demo)" : "Submit Quiz"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CourseDetail() {
  const params = useParams<{ id: string }>();
  const courseId = params.id ?? "";
  const { wallet, isDemoMode } = useWallet();
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const isAuthenticated = !!wallet || isDemoMode;

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: isAuthenticated,
  });

  const progress = useMemo(() => {
    return progressList?.find((p) => p.courseId === courseId);
  }, [progressList, courseId]);

  const currentLesson = lessons?.[selectedLessonIndex];
  const completedSet = new Set(progress?.completedLessons ?? []);
  const isLessonCompleted = currentLesson ? completedSet.has(currentLesson.id) : false;
  const completedCount = completedSet.size;
  const totalLessons = lessons?.length ?? 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleNextLesson = () => {
    if (lessons && selectedLessonIndex < lessons.length - 1) {
      setSelectedLessonIndex((prev) => prev + 1);
      setShowQuiz(false);
    }
  };

  if (courseLoading || lessonsLoading) {
    return (
      <div className="min-h-screen pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-4 w-96" />
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!course || !lessons) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Course not found</h2>
          <Link href="/courses">
            <Button variant="outline" className="mt-4">
              Back to Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <Link href="/courses">
            <Button variant="ghost" size="sm" className="mb-2 gap-1" data-testid="button-back">
              <ChevronLeft className="h-4 w-4" />
              Back to Courses
            </Button>
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-course-title">
                {course.title}
              </h1>
              <p className="mt-1 text-muted-foreground">{course.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="gap-1.5 bg-primary/10 text-primary">
                <Coins className="h-3.5 w-3.5" />
                +{course.kasReward} KAS
              </Badge>
              <Badge variant="outline" className="capitalize">
                {course.difficulty}
              </Badge>
            </div>
          </div>

          {wallet && (
            <div className="mt-4 max-w-md space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Progress</span>
                <span className="font-medium">
                  {completedCount}/{totalLessons} lessons ({progressPercent}%)
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/50">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {lessons.map((lesson, index) => {
                    const isCompleted = completedSet.has(lesson.id);
                    const isActive = index === selectedLessonIndex;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setSelectedLessonIndex(index);
                          setShowQuiz(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50"
                        }`}
                        data-testid={`lesson-nav-${lesson.id}`}
                      >
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            isCompleted
                              ? "border-primary bg-primary text-primary-foreground"
                              : isActive
                              ? "border-primary text-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </div>
                        <span className="flex-1 truncate">{lesson.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-6">
            {currentLesson && (
              <>
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold" data-testid="text-lesson-title">
                        {currentLesson.title}
                      </h2>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {currentLesson.duration}
                      </Badge>
                    </div>

                    {currentLesson.videoUrl && (
                      <div className="mb-6 aspect-video w-full overflow-hidden rounded-md bg-muted">
                        <iframe
                          src={currentLesson.videoUrl}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentLesson.title}
                          data-testid="video-lesson"
                        />
                      </div>
                    )}

                    {currentLesson.thumbnail && !currentLesson.videoUrl && (
                      <div className="mb-6 w-full overflow-hidden rounded-md">
                        <img
                          src={currentLesson.thumbnail}
                          alt={currentLesson.title}
                          className="w-full object-cover"
                          data-testid="img-lesson-thumbnail"
                        />
                      </div>
                    )}

                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                      data-testid="lesson-content"
                    />

                    <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-6">
                      <Button
                        variant="outline"
                        disabled={selectedLessonIndex === 0}
                        onClick={() => {
                          setSelectedLessonIndex((prev) => prev - 1);
                          setShowQuiz(false);
                        }}
                        className="gap-1"
                        data-testid="button-prev-lesson"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      {!isLessonCompleted && !showQuiz ? (
                        <Button
                          onClick={() => setShowQuiz(true)}
                          className="gap-1"
                          data-testid="button-take-quiz"
                        >
                          <Play className="h-4 w-4" />
                          Take Quiz
                        </Button>
                      ) : isLessonCompleted && selectedLessonIndex < lessons.length - 1 ? (
                        <Button onClick={handleNextLesson} className="gap-1" data-testid="button-next-lesson">
                          Next Lesson
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : isLessonCompleted && selectedLessonIndex === lessons.length - 1 ? (
                        <Link href="/certificates">
                          <Button className="gap-1" data-testid="button-view-certificate">
                            <Award className="h-4 w-4" />
                            View Quiz Proof
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                {showQuiz && (
                  <QuizSection
                    lessonId={currentLesson.id}
                    courseId={courseId}
                    onComplete={handleNextLesson}
                    isLastLesson={selectedLessonIndex === lessons.length - 1}
                  />
                )}

                <QASection lessonId={currentLesson.id} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
