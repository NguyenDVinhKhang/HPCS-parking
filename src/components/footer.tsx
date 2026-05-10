import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="container mx-auto px-4 py-6">
        <Separator className="mb-4" />
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} HPCS. Hệ thống quản lý đỗ xe.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Next.js &amp; shadcn/ui
          </p>
        </div>
      </div>
    </footer>
  );
}
