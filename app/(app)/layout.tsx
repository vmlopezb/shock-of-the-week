import SiteHeader from "@/components/SiteHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </>
  );
}
