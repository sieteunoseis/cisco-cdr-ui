import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchPage } from "@/pages/SearchPage";
import { CallDetailPage } from "@/pages/CallDetailPage";
import { SqlPage } from "@/pages/SqlPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SeatMapPage } from "@/pages/SeatMapPage";
import { AlertsPage } from "@/pages/AlertsPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/call/:callId" element={<CallDetailPage />} />
        <Route path="/sql" element={<SqlPage />} />
        <Route path="/seat-map" element={<SeatMapPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
