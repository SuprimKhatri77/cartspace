import Link from "next/link";
import { NotFoundView } from "@/components/feedback/not-found-view";
import { site } from "@/lib/site";

// Outside the shop layout (an unmatched URL): its own minimal header.
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col">
      <div className="container-page flex h-16 items-center">
        <Link href="/" className="font-serif text-[1.65rem] leading-none">
          {site.name}
        </Link>
      </div>
      <NotFoundView />
    </main>
  );
}
