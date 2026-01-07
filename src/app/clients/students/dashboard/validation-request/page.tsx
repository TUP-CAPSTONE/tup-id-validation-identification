"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WebcamCapture from '@/components/webcam-capture';

export default function ValidationRequestPage() {
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [faceFront, setFaceFront] = useState<string | null>(null);
  const [faceLeft, setFaceLeft] = useState<string | null>(null);
  const [faceRight, setFaceRight] = useState<string | null>(null);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-white sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg text-red-700">ID Validation Request</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 gap-6 p-4">
          <div className="w-full max-w-5xl">
            
            {/* ID Photo Card */}
            <Card className="border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">ID Photo</CardTitle>
                <CardDescription>Capture a clear photo of your school ID</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-3">
                  <WebcamCapture
                    label={idPhoto ? "✅ Retake ID Photo" : "📸 Capture ID Photo"}
                    onCapture={setIdPhoto}
                    useBackCamera={true}
                  />
                  
                  {idPhoto && (
                    <div className="mt-4">
                      <p className="text-green-600 font-semibold mb-2">✅ ID Photo Captured!</p>
                      <img 
                        src={idPhoto} 
                        alt="ID" 
                        className="w-64 h-64 object-cover rounded-lg border-2 border-green-500" 
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Face Photos Card */}
            <Card className="mt-4 border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">Face Photos (3 Angles)</CardTitle>
                <CardDescription>Capture your face from three different angles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
                  {/* Front */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Front View</h3>
                    <WebcamCapture
                      label={faceFront ? "✅ Retake" : "📸 Front"}
                      onCapture={setFaceFront}
                      useBackCamera={false}
                    />
                    {faceFront && (
                      <img 
                        src={faceFront} 
                        alt="Front" 
                        className="mt-3 w-full h-40 object-cover rounded-lg border-2 border-green-500" 
                      />
                    )}
                  </div>

                  {/* Left */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Left View</h3>
                    <WebcamCapture
                      label={faceLeft ? "✅ Retake" : "📸 Left"}
                      onCapture={setFaceLeft}
                      useBackCamera={false}
                    />
                    {faceLeft && (
                      <img 
                        src={faceLeft} 
                        alt="Left" 
                        className="mt-3 w-full h-40 object-cover rounded-lg border-2 border-green-500" 
                      />
                    )}
                  </div>

                  {/* Right */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Right View</h3>
                    <WebcamCapture
                      label={faceRight ? "✅ Retake" : "📸 Right"}
                      onCapture={setFaceRight}
                      useBackCamera={false}
                    />
                    {faceRight && (
                      <img 
                        src={faceRight} 
                        alt="Right" 
                        className="mt-3 w-full h-40 object-cover rounded-lg border-2 border-green-500" 
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card className="mt-6 border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">Capture Status</CardTitle>
                <CardDescription>Check which photos have been captured</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`flex items-center gap-2 ${idPhoto ? "text-green-600" : "text-gray-500"}`}>
                      <span className="text-xl">{idPhoto ? "✅" : "⬜"}</span>
                      <span className="font-medium">ID Photo</span>
                    </div>
                    <div className={`flex items-center gap-2 ${faceFront ? "text-green-600" : "text-gray-500"}`}>
                      <span className="text-xl">{faceFront ? "✅" : "⬜"}</span>
                      <span className="font-medium">Front Face</span>
                    </div>
                    <div className={`flex items-center gap-2 ${faceLeft ? "text-green-600" : "text-gray-500"}`}>
                      <span className="text-xl">{faceLeft ? "✅" : "⬜"}</span>
                      <span className="font-medium">Left Face</span>
                    </div>
                    <div className={`flex items-center gap-2 ${faceRight ? "text-green-600" : "text-gray-500"}`}>
                      <span className="text-xl">{faceRight ? "✅" : "⬜"}</span>
                      <span className="font-medium">Right Face</span>
                    </div>
                  </div>
                  
                  {idPhoto && faceFront && faceLeft && faceRight && (
                    <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg font-semibold flex items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <span>All photos captured! Camera test successful!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}