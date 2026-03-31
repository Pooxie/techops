import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7" }}>
      <Sidebar />
      <BottomNav />
      <div
        style={{ minHeight: "100vh" }}
        className="md:pl-[240px] max-md:pb-[60px]"
      >
        {children}
      </div>
    </div>
  );
}
