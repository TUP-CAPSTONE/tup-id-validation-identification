"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  FileText,
  Shield,
  Activity,
  LogIn,
  LogOut,
  UserCog,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

// Helper function to calculate time ago
function getTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput

  if (isNaN(date.getTime())) return ""

  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

// Format session duration
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

interface DashboardStats {
  systemAccounts: {
    total: number
    admin: number
    osa: number
    gate: number
    activeNow: number
  }
  students: {
    total: number
    validated: number
    notValidated: number
    pendingRegistrations: number
  }
  registrations: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  idValidation: {
    pending: number
    accepted: number
    rejected: number
    total: number
  }
  activeSessions: Array<{
    userId: string
    email: string
    name: string
    role: string
    loginTime: string
  }>
  recentLoginActivity: Array<{
    userId: string
    email: string
    name: string
    role: string
    action: "login" | "logout"
    timestamp: string
    sessionDuration?: number
  }>
  recentActivity: Array<{
    type: string
    message: string
    timestamp: Date
    status?: string
    role?: string
  }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        if (!stats) setLoading(true)

        const res = await fetch("/api/admin/dashboard")
        const data = await res.json()

        setStats(data)
      } catch (error) {
        console.error("Dashboard fetch error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()

    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const defaultStats: DashboardStats = {
    systemAccounts: { total: 0, admin: 0, osa: 0, gate: 0, activeNow: 0 },
    students: { total: 0, validated: 0, notValidated: 0, pendingRegistrations: 0 },
    registrations: { pending: 0, approved: 0, rejected: 0, total: 0 },
    idValidation: { pending: 0, accepted: 0, rejected: 0, total: 0 },
    activeSessions: [],
    recentLoginActivity: [],
    recentActivity: [],
  }

  const safeStats: DashboardStats = {
    systemAccounts: { ...defaultStats.systemAccounts, ...(stats?.systemAccounts ?? {}) },
    students: { ...defaultStats.students, ...(stats?.students ?? {}) },
    registrations: { ...defaultStats.registrations, ...(stats?.registrations ?? {}) },
    idValidation: { ...defaultStats.idValidation, ...(stats?.idValidation ?? {}) },
    activeSessions: stats?.activeSessions ?? defaultStats.activeSessions,
    recentLoginActivity: stats?.recentLoginActivity ?? defaultStats.recentLoginActivity,
    recentActivity: stats?.recentActivity ?? defaultStats.recentActivity,
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-full p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-10">
                <h1 className="text-5xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                <p className="text-gray-600 text-lg">System overview and recent activity</p>
              </div>

              {/* Main Content */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Stats Overview */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* System Accounts */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          System Accounts
                        </CardTitle>
                        <Shield className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <>
                            <div className="text-2xl font-bold">
                              {safeStats.systemAccounts.total}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {safeStats.systemAccounts.activeNow} active now
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Total Students */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Students
                        </CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <>
                            <div className="text-2xl font-bold">
                              {safeStats.students.total}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {safeStats.students.validated} validated
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pending Registrations */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Pending Registrations
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <>
                            <div className="text-2xl font-bold">
                              {safeStats.registrations.pending}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Awaiting approval
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pending Validations */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Pending Validations
                        </CardTitle>
                        <FileText className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <>
                            <div className="text-2xl font-bold">
                              {safeStats.idValidation.pending}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Awaiting review
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Active Sessions & Quick Actions */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                  {/* Active Sessions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        Active Sessions ({safeStats.activeSessions.length})
                      </CardTitle>
                      <CardDescription>Currently logged in system accounts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : safeStats.activeSessions.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {safeStats.activeSessions.map((session, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                                <UserCog className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{session.name}</p>
                                <p className="text-xs text-muted-foreground">{session.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {session.role}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {getTimeAgo(session.loginTime)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No active sessions
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Link href="/clients/admin/dashboard/manage-id-validation">
                        <Button variant="outline" className="w-full justify-start">
                          <FileText className="mr-2 h-4 w-4" />
                          Manage ID Validation Requests
                          {safeStats.idValidation.pending > 0 && (
                            <Badge variant="destructive" className="ml-auto">
                              {safeStats.idValidation.pending}
                            </Badge>
                          )}
                        </Button>
                      </Link>

                      <Link href="/clients/admin/dashboard/resend-validation-qr">
                        <Button variant="outline" className="w-full justify-start">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend Validation QR Codes
                        </Button>
                      </Link>

                      <Link href="/clients/admin/dashboard/manage-registrations">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="mr-2 h-4 w-4" />
                          Manage Student Registrations
                          {safeStats.registrations.pending > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {safeStats.registrations.pending}
                            </Badge>
                          )}
                        </Button>
                      </Link>

                      <Link href="/clients/admin/dashboard/manage-system-accounts">
                        <Button variant="outline" className="w-full justify-start">
                          <Shield className="mr-2 h-4 w-4" />
                          Manage System Accounts
                        </Button>
                      </Link>

                      <Link href="/clients/admin/dashboard/settings">
                        <Button variant="outline" className="w-full justify-start">
                          <Activity className="mr-2 h-4 w-4" />
                          System Settings
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Login/Logout Activity */}
                <div className="mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Login/Logout Activity</CardTitle>
                      <CardDescription>
                        System account authentication events
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : safeStats.recentLoginActivity.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {safeStats.recentLoginActivity.map((activity, index) => (
                            <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                activity.action === "login" ? "bg-green-100" : "bg-gray-100"
                              }`}>
                                {activity.action === "login" ? (
                                  <LogIn className="h-4 w-4 text-green-600" />
                                ) : (
                                  <LogOut className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {activity.name} {activity.action === "login" ? "logged in" : "logged out"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.role}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {getTimeAgo(activity.timestamp)}
                                  </span>
                                  {activity.action === "logout" && activity.sessionDuration && (
                                    <span className="text-xs text-muted-foreground">
                                      • Session: {formatDuration(activity.sessionDuration)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No recent login activity
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
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* System Accounts Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          System Accounts Breakdown
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
                                <Shield className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">Admin</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.systemAccounts.admin}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">OSA</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.systemAccounts.osa}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium">Gate</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.systemAccounts.gate}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">Total</span>
                              <span className="text-sm font-bold">
                                {safeStats.systemAccounts.total}
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
                                {safeStats.students.validated}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium">Not Validated</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.students.notValidated}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium">Pending Request</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.students.pendingRegistrations}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">Total Students</span>
                              <span className="text-sm font-bold">
                                {safeStats.students.total}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

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
                                {safeStats.idValidation.pending}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Accepted</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.idValidation.accepted}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-medium">Rejected</span>
                              </div>
                              <span className="text-sm font-bold">
                                {safeStats.idValidation.rejected}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">Total</span>
                              <span className="text-sm font-bold">
                                {safeStats.idValidation.total}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}