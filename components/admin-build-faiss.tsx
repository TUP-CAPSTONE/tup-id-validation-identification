"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

export function AdminBuildFaiss() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuild = async () => {
    setStatus("Building FAISS index... Please wait.");
    setStatusType("info");
    setIsBuilding(true);

    try {
      const buildUrl = process.env.NEXT_PUBLIC_FAISS_BUILD_URL;

      if (!buildUrl) {
        setStatus(
          "Configuration error: FAISS build URL not set. Please contact system administrator.",
        );
        setStatusType("error");
        setIsBuilding(false);
        return;
      }

      const res = await fetch(buildUrl, {
        method: "POST",
        headers: {
          "X-Admin-Key": process.env.NEXT_PUBLIC_INDEXER_SECRET || "",
        },
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(data.message || "FAISS index built successfully!");
        setStatusType("success");
      } else {
        setStatus(
          data.error || "Failed to build FAISS index. Unknown error occurred.",
        );
        setStatusType("error");
      }
    } catch (error: any) {
      setStatus(
        "Server not reachable. Please check the backend service status.",
      );
      setStatusType("error");
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Info className="h-5 w-5" />
            About FAISS Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">
            The FAISS (Facebook AI Similarity Search) index is used for fast
            facial recognition matching. Rebuild this index whenever student
            face photos are updated to ensure accurate identification during
            entrance/exit scanning.
          </p>
        </CardContent>
      </Card>

      {/* Build Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Rebuild FAISS Index
          </CardTitle>
          <CardDescription>
            Trigger a rebuild of the facial recognition index from the latest
            student face photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-semibold mb-1">
                  Important Notice
                </p>
                <p className="text-sm text-amber-700">
                  This operation may take several minutes depending on the
                  number of student profiles. The facial recognition system may
                  be temporarily unavailable during the rebuild.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleBuild}
            disabled={isBuilding}
            className="w-full bg-[#b32032] hover:bg-[#8b1828]"
            size="lg"
          >
            {isBuilding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building Index...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Rebuild FAISS Index
              </>
            )}
          </Button>

          {/* Status Alert */}
          {status && (
            <Alert
              className={`w-full flex justify-center items-center py-4 ${
                statusType === "success"
                  ? "border-green-200 bg-green-50"
                  : statusType === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-center gap-3 w-full">
                {/* Icon */}
                <div className="shrink-0">
                  {statusType === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {statusType === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  {statusType === "info" && (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  )}
                </div>

                {/* Text - Forced to one line and centered */}
                <AlertDescription
                  className={`whitespace-nowrap font-medium text-center ${
                    statusType === "success"
                      ? "text-green-800"
                      : statusType === "error"
                        ? "text-red-800"
                        : "text-blue-800"
                  }`}
                >
                  {status}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Technical Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Backend Service:</span>
              <span className="text-gray-600">Railway.app</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Index Type:</span>
              <span className="text-gray-600">FAISS (Flat L2)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Data Source:</span>
              <span className="text-gray-600">
                Firebase Storage (enrollment_images)
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Authentication:</span>
              <span className="text-gray-600">Admin API Key</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
