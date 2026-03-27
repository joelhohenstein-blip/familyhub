import { SidebarTrigger } from "~/components/ui/sidebar"
import { Separator } from "~/components/ui/separator"
import { LanguageMenu } from "~/components/ui/language-menu"
import { useFamily } from "~/utils/familyContext"

export function SiteHeader({ title = "Dashboard" }: { title?: string }) {
  const { currentFamily } = useFamily()
  
  // Format title with surname if available
  const displayTitle = currentFamily?.surname 
    ? `${currentFamily.surname} FamilyHub ${title}`
    : `FamilyHub ${title}`

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-sm font-medium">{displayTitle}</h1>
      </div>
      <LanguageMenu />
    </header>
  )
}
