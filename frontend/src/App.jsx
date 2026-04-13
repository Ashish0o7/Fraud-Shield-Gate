import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AuditLedger from './pages/AuditLedger';
import MLModels from './pages/MLModels';
import HealthPage from './pages/HealthPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-surface text-on-surface overflow-hidden antialiased">
        <Sidebar />
        <div className="flex-1 overflow-auto bg-surface relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/audit" element={<AuditLedger />} />
            <Route path="/ml-models" element={<MLModels />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
