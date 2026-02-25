import { AdminLayout } from "@/components/admin/AdminLayout";
import { HubSettingsTab } from "@/components/admin/HubSettingsTab";

export default function Marketplace() {
  const handleSave = async () => {
    // Refresh handled internally by HubSettingsTab
  };

  return (
    <AdminLayout title="Marketplace">
      <HubSettingsTab onSave={handleSave} isSaving={false} />
    </AdminLayout>
  );
}
