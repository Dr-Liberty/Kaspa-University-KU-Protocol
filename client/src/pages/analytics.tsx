import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  Award,
  Coins,
  TrendingUp,
  Trophy,
  Activity,
  Zap,
  BarChart3,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalCourses: number;
    totalCertificates: number;
    totalKasDistributed: number;
    totalQuizzes: number;
    avgScore: number;
  };
  activityData: Array<{
    date: string;
    users: number;
    completions: number;
    rewards: number;
  }>;
  coursePopularity: Array<{
    name: string;
    completions: number;
    category: string;
  }>;
  difficultyDistribution: Array<{
    name: string;
    value: number;
  }>;
  topLearners: Array<{
    address: string;
    totalKas: number;
    certificates: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
    txHash?: string;
  }>;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(180, 70%, 45%)",
  "hsl(200, 70%, 50%)",
  "hsl(220, 70%, 55%)",
];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  description?: string;
  trend?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">+{trend}% this week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load analytics data</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-analytics-title">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground">
          Real-time insights into Kaspa University learning activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Learners"
          value={analytics.overview.totalUsers}
          icon={Users}
          description="Active wallet addresses"
          trend={12}
        />
        <StatCard
          title="Courses Available"
          value={analytics.overview.totalCourses}
          icon={BookOpen}
          description="Across all categories"
        />
        <StatCard
          title="Certificates Issued"
          value={analytics.overview.totalCertificates}
          icon={Award}
          description="Verifiable on-chain"
          trend={24}
        />
        <StatCard
          title="KAS Distributed"
          value={`${analytics.overview.totalKasDistributed.toFixed(2)} KAS`}
          icon={Coins}
          description="Learn-to-earn rewards"
          trend={18}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Quizzes Completed"
          value={analytics.overview.totalQuizzes}
          icon={Zap}
        />
        <StatCard
          title="Average Score"
          value={`${analytics.overview.avgScore}%`}
          icon={BarChart3}
        />
        <StatCard
          title="Active Today"
          value={Math.floor(analytics.overview.totalUsers * 0.3)}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Learning Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    name="Completions"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="New Users"
                    stroke="hsl(var(--accent-foreground))"
                    fill="hsl(var(--accent) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Popularity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.coursePopularity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar 
                    dataKey="completions" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Difficulty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.difficultyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {analytics.difficultyDistribution.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topLearners.map((learner, index) => (
                <div
                  key={learner.address}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`row-learner-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-mono text-sm">
                        {learner.address.slice(0, 12)}...{learner.address.slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {learner.certificates} certificates
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Coins className="h-3 w-3" />
                    {learner.totalKas.toFixed(2)} KAS
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-3 rounded-md border border-border/50"
                data-testid={`row-activity-${index}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {activity.type === "completion" && (
                    <Award className="h-4 w-4 text-primary shrink-0" />
                  )}
                  {activity.type === "reward" && (
                    <Coins className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  {activity.type === "certificate" && (
                    <Trophy className="h-4 w-4 text-purple-500 shrink-0" />
                  )}
                  {(activity.type === "question" || activity.type === "answer") && (
                    <Activity className="h-4 w-4 text-blue-500 shrink-0" />
                  )}
                  <span className="text-sm truncate">{activity.description}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                  {activity.txHash && !activity.txHash.startsWith("demo") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      asChild
                      data-testid={`button-view-tx-${index}`}
                    >
                      <a
                        href={`https://kaspa.stream/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on kaspa.stream"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
