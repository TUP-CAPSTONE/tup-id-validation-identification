"use client";

import { AppSidebar } from "@/components/osa-app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  FileText,
  TrendingUp,
  Activity,
} from "lucide-react";
import Link from "next/link";

// Helper function to calculate time ago
function getTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

interface ValidationRequest {
  id: string;
  studentName: string;
  status: string;
  requestTime: string;
  tupId: string;
}

interface Student {
  studentNumber: string;
  fullName: string;
  status: string;
}

interface DashboardStats {
  idValidation: {
    pending: number;
    accepted: number;
    rejected: number;
    total: number;
  };
  students: {
    total: number;
    validated: number;
    notValidated: number;
    pendingRequests: number;
  };
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: Date;
    status?: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        if (!stats) setLoading(true); // prevent flicker on refresh

        const res = await fetch("/api/osa/dashboard");
        const data = await res.json();

        setStats(data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();

    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "20rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg">Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Stats Overview */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Pending ID Validations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Requests
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.idValidation.pending || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Awaiting review
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Accepted Validations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Accepted Requests
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.idValidation.accepted || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        QR codes sent
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Total Students */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Validated Students
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.students.validated || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        of {stats?.students.total || 0} total students
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Total Requests */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Requests
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.idValidation.total || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        All time submitted
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Priority Actions & Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Quick Actions */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/clients/OSA/dashboard/id-validation">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="mr-2 h-4 w-4" />
                    Review Validation Requests
                    {stats && stats.idValidation.pending > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {stats.idValidation.pending}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <Link href="/clients/OSA/dashboard/scan-validation">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    QR Code Scanning
                  </Button>
                </Link>

                <Link href="/clients/OSA/dashboard/file-offense">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    File Student Offense
                  </Button>
                </Link>

                <Link href="/clients/OSA/dashboard/students-list">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    View Students List
                    {stats && stats.students.pendingRequests > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {stats.students.pendingRequests} pending
                      </Badge>
                    )}
                  </Button>
                </Link>

                <Link href="/clients/OSA/dashboard/feedbacks-reports">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Feedbacks & Bug Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates across all modules
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity, index) => {
                      const timeAgo = getTimeAgo(activity.timestamp);

                      return (
                        <div key={index} className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {activity.status === "pending" && (
                              <Clock className="h-4 w-4 text-orange-500" />
                            )}
                            {activity.status === "accepted" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {activity.status === "rejected" && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {!activity.status && (
                              <Activity className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {activity.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {timeAgo}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {activity.type}
                              </Badge>
                              {activity.status && (
                                <Badge
                                  variant={
                                    activity.status === "pending"
                                      ? "secondary"
                                      : activity.status === "rejected"
                                        ? "destructive"
                                        : "outline"
                                  }
                                  className={
                                    activity.status === "accepted"
                                      ? "bg-green-500 hover:bg-green-500 text-black text-xs"
                                      : "text-xs"
                                  }
                                >
                                  {activity.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No recent activity
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-4">
              Statistics Summary
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {/* ID Validation Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Validation Requests Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                        <span className="text-sm font-bold">
                          {stats?.idValidation.pending || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Accepted</span>
                        </div>
                        <span className="text-sm font-bold">
                          {stats?.idValidation.accepted || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">Rejected</span>
                        </div>
                        <span className="text-sm font-bold">
                          {stats?.idValidation.rejected || 0}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="text-sm font-bold">
                          {stats?.idValidation.total || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student Validation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Student Validation Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Validated</span>
                        </div>
                        <span className="text-sm font-bold">
                          {stats?.students.validated || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            Not Validated
                          </span>
                        </div>
                        <span className="text-sm font-bold">
                          {stats?.students.notValidated || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">
                            Request Pending
                          </span>
                        </div>
                        <span className="text-sm font-bold">
                          {stats?.students.pendingRequests || 0}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          Total Students
                        </span>
                        <span className="text-sm font-bold">
                          {stats?.students.total || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
