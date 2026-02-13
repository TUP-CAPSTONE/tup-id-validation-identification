import { Calendar } from "@/components/ui/calendar"
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

export function DatePicker() {
  return (
    // Changed w-250 to w-full to stay within sidebar bounds
    // Added p-0 to prevent double padding issues
    <SidebarGroup className="w-full p-0">
      <SidebarGroupContent className="flex justify-center">
        <Calendar 
          className="w-full [&_[role=gridcell].bg-accent]:bg-sidebar-primary [&_[role=gridcell].bg-accent]:text-sidebar-primary-foreground" 
          // Removed the broken **: syntax and used standard sizing
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}