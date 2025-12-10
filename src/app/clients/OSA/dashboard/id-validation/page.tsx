import { AppSidebar } from "@/components/osa-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator";
import { columns, Requests } from "@/components/osa-columns"
import { DataTable } from "@/components/osa-data-table"
import { db } from "@/lib/firebaseConfig"
import { collection, getDocs } from "firebase/firestore"

async function getData(): Promise<Requests[]> {
  try {
    const requestsCollection = collection(db, "validation_requests")
    const snapshot = await getDocs(requestsCollection)
    
    const data: Requests[] = snapshot.docs.map((doc) => ({
      requestId: doc.data().requestId,
      studentId: doc.data().studentId,
      studentName: doc.data().studentName,
      tupId: doc.data().tupId,
      email: doc.data().email,
      phoneNumber: doc.data().phoneNumber,
      idPicture: doc.data().idPicture,
      selfiePictures: doc.data().selfiePictures,
      status: doc.data().status,
      requestTime: doc.data().requestTime,
    }))
    
    return data
  } catch (error) {
    console.error("Error fetching data from Firestore:", error)
    return []
  }
}

export default async function ValidationPage() {
  const data = await getData()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg">Validation Requests</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <DataTable columns={columns} data={data} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}