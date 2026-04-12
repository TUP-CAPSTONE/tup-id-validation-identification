"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  studentId: string;
  action: string;
  gateId: string;
  timestamp: string;
  confidenceScore: number;
  scannedBy: string;
}

type LogType = "entrance" | "exit";

const ENTRANCE_EXIT_LOGS_COLLECTION = "entrance_exit_logs";

export function EntranceExitLogs() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [logType, setLogType] = useState<LogType>("entrance");
  const [entranceLogs, setEntranceLogs] = useState<LogEntry[]>([]);
  const [exitLogs, setExitLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Real-time listener for Firestore
  useEffect(() => {
    setLoading(true);
    setError("");

    // Convert date to Firestore document ID format (YYYY-MM-DD)
    const docId = selectedDate;
    const docRef = doc(db, ENTRANCE_EXIT_LOGS_COLLECTION, docId);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          setEntranceLogs([]);
          setExitLogs([]);
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        const logs = data.logs || [];

        // Separate entrance and exit logs
        const entrance = logs
          .filter((log: any) => log.action === "entrance")
          .map((log: any, index: number) => ({
            id: `entrance-${index}-${log.timestamp?.toMillis() || Date.now()}`,
            studentId: log.studentId,
            action: log.action,
            gateId: log.gateId,
            timestamp: log.timestamp?.toDate().toISOString() || new Date().toISOString(),
            confidenceScore: log.confidenceScore,
            scannedBy: log.scannedBy,
          }))
          .sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        const exit = logs
          .filter((log: any) => log.action === "exit")
          .map((log: any, index: number) => ({
            id: `exit-${index}-${log.timestamp?.toMillis() || Date.now()}`,
            studentId: log.studentId,
            action: log.action,
            gateId: log.gateId,
            timestamp: log.timestamp?.toDate().toISOString() || new Date().toISOString(),
            confidenceScore: log.confidenceScore,
            scannedBy: log.scannedBy,
          }))
          .sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        setEntranceLogs(entrance);
        setExitLogs(exit);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to logs:", err);
        setError("Failed to load logs. Please try again.");
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or date change
    return () => unsubscribe();
  }, [selectedDate]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatConfidence = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  const currentLogs = logType === "entrance" ? entranceLogs : exitLogs;

  const renderLogsTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b32032]"></div>
        </div>
      );
    }

    if (currentLogs.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>No {logType} logs found for this date.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                TUP ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Action
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Gate ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Confidence Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {log.studentId}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge
                    variant={logType === "entrance" ? "default" : "secondary"}
                    className={
                      logType === "entrance"
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    }
                  >
                    {log.action.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {log.gateId}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`font-medium ${
                      log.confidenceScore >= 0.8
                        ? "text-green-600"
                        : log.confidenceScore >= 0.6
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatConfidence(log.confidenceScore)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Selector & Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex-1 max-w-xs w-full">
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Select Date
                </div>
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full"
              />
            </div>
            <div className="flex gap-6 items-end pb-1">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Entrance</p>
                <p className="text-2xl font-bold text-green-600">
                  {entranceLogs.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Exit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {exitLogs.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabbed Logs Card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Log Type</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select which type of logs to view
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tab Selection */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Label
              htmlFor="entrance"
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                logType === "entrance" 
                  ? "border-green-500 bg-green-50" 
                  : "hover:bg-muted"
              )}
              onClick={() => setLogType("entrance")}
            >
              <div className={cn(
                "mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                logType === "entrance" ? "border-green-500" : "border-gray-300"
              )}>
                {logType === "entrance" && (
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-green-600" />
                  <p className="font-medium">Entrance Logs</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  View all entrance activities for the selected date
                </p>
              </div>
              <div className="flex items-center">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            </Label>

            <Label
              htmlFor="exit"
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                logType === "exit" 
                  ? "border-blue-500 bg-blue-50" 
                  : "hover:bg-muted"
              )}
              onClick={() => setLogType("exit")}
            >
              <div className={cn(
                "mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                logType === "exit" ? "border-blue-500" : "border-gray-300"
              )}>
                {logType === "exit" && (
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                  <p className="font-medium">Exit Logs</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  View all exit activities for the selected date
                </p>
              </div>
              <div className="flex items-center">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
            </Label>
          </div>

          {/* Table Display */}
          <div className="pt-4">
            {renderLogsTable()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}