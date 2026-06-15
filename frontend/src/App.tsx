import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Chat from './Chat';
import { useEffect, useState } from 'react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a token
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return null; // or a loading spinner
  }

  return (
    <Routes>
      <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} />} />
      <Route 
        path="/chat" 
        element={isAuthenticated ? <Chat onLogout={() => {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }} /> : <Navigate to="/login" />} 
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} />
    </Routes>
  );
}
