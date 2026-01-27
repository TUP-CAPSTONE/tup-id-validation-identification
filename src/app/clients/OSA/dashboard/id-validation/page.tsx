import { AppSidebar } from "@/components/osa-app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"

import { db } from "@/lib/firebaseConfig"
import { collection, getDocs } from "firebase/firestore"

import {
  IdValidationTable,
  ValidationRequest,
} from "@/components/osa-id-validation-table"

async function getRequests(): Promise<ValidationRequest[]> {
  const snapshot = await getDocs(collection(db, "validation_requests2"))

  return snapshot.docs.map((doc) => {
    const data = doc.data()

    return {
      requestId: doc.id,
      studentId: data.studentId,
      studentName: data.studentName,
      tupId: data.tupId,
      email: data.email,
      phoneNumber: data.phoneNumber,
      idPicture: data.idPicture,
      corFile: data.corFile,
      selfiePictures: data.selfiePictures,
      status: data.status,

      // ✅ Firestore Timestamp → string
      requestTime: data.requestTime
        ? data.requestTime.toDate().toISOString()
        : "",
    }
  })
}

export default async function ValidationPage() {
  const requests = await getRequests()

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "20rem", // This matches your w-80 (20rem) sidebar
      } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex h-16 items-center gap-2 border-b px-4 bg-background z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg">
                  ID Validation Requests
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="p-4">
          <IdValidationTable requests={requests} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}