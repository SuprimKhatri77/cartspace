import { AccountNav } from "@/modules/account/components/account-nav";

export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="container-page grid gap-10 pt-10 pb-10 lg:grid-cols-[13rem_1fr] lg:gap-16 lg:pt-16">
      <aside>
        <p className="eyebrow mb-4 px-4">Your account</p>
        <AccountNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
