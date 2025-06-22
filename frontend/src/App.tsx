import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ChatPage } from './pages/ChatPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import { websocketService } from './services/websocket';

function App() {
  const { token, isAuthenticated } = useAuthStore();
  
  // Connect to WebSocket when the app loads if authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      websocketService.connect(token);
    }
    
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated, token]);
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<ChatPage />} />
        </Route>
        
        {/* Redirect to login or chat based on auth status */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />} 
        />
      </Routes>
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;