import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppShell from './components/AppShell.jsx';

import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import AuctionDetailPage from './pages/AuctionDetailPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import SellPage from './pages/SellPage.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';
import SellerDashboard from './pages/SellerDashboard.jsx';
import SalesHandoverPage from './pages/SalesHandoverPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Marketplace Browse Pages (Public, accessible to all students) */}
          <Route
            path="/explore"
            element={
              <AppShell>
                <ExplorePage />
              </AppShell>
            }
          />
          <Route
            path="/assistant"
            element={
              <AppShell>
                <AssistantPage />
              </AppShell>
            }
          />
          <Route
            path="/auction/:id"
            element={
              <AppShell>
                <AuctionDetailPage />
              </AppShell>
            }
          />

          {/* Protected Pages (Requires login) */}
          <Route
            path="/sell"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SellPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bids"
            element={
              <ProtectedRoute>
                <AppShell>
                  <BuyerDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller-dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SellerDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SalesHandoverPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppShell>
                  <NotificationsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Legacy & Default Redirects */}
          <Route path="/dashboard" element={<Navigate to="/explore" replace />} />
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
