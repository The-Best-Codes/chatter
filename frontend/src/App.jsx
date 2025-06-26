import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { NotificationProvider } from "./contexts/NotificationContext";

import { AdminPage } from "./pages/Admin";
import { ChatPage } from "./pages/Chat";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { SignupPage } from "./pages/Signup";

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;
