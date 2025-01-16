import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ChannelProvider } from './contexts/ChannelContext';
import Login from './components/Login';
import Signup from './components/Signup';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import Chat from './components/Chat';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import { useEffect } from 'react';
import { initializeBotService } from './services/botService';

function App() {
  useEffect(() => {
    let cleanup;
    
    const initBot = async () => {
      cleanup = await initializeBotService();
    };
    
    initBot();
    
    // Cleanup on unmount
    return () => cleanup && cleanup();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <ChannelProvider>
          <div className="min-h-screen bg-gray-900">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </ChannelProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
