import Footer from "@/components/layout/Footer";

interface UserDashboardFooterProps {
  sidebarCollapsed?: boolean;
}

export default function UserDashboardFooter({
  sidebarCollapsed = false,
}: UserDashboardFooterProps) {
  return (
    <Footer
      dashboardLayout={sidebarCollapsed ? "user-collapsed" : "user-expanded"}
    />
  );
}
