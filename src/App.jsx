import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import CameraSection from './components/CameraSection';
import OutputSection from './components/OutputSection';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';

const darkGreenTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff00',
      contrastText: '#101010',
    },
    secondary: {
      main: '#39ff14',
    },
    background: {
      default: '#101010',
      paper: '#181818',
    },
    text: {
      primary: '#e5ffe1',
      secondary: '#70e670',
    },
  },
  typography: {
    fontFamily: 'Quicksand, monospace, Arial',
    h4: {
      fontWeight: 700,
    },
  },
});

function MainPage({ user, socket, sentence, latestLetter, confidence, landmarks, clearSentence, onLogout }) {
  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <HeroSection />
      <CameraSection
        socket={socket}
        latestLetter={latestLetter}
        confidence={confidence}
        landmarks={landmarks}
        sentence={sentence}
      />
      <OutputSection
        sentence={sentence}
        clearSentence={clearSentence}
      />
      <Footer />
    </>
  );
}

function App() {
  const [sentence, setSentence] = useState('');
  const [latestLetter, setLatestLetter] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(() => {
    // Persist user in localStorage
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    newSocket.on('connect', () => {
      console.log('✅ Connected to Flask Socket.IO backend');
    });
    newSocket.on('prediction', (data) => {
      if (data) {
        if (data.sentence !== undefined) setSentence(data.sentence);
        if (data.letter !== undefined) setLatestLetter(data.letter);
        if (data.confidence !== undefined) setConfidence(data.confidence);
        if (data.landmarks !== undefined) setLandmarks(data.landmarks);
      }
    });
    newSocket.on('disconnect', () => {
      console.warn('⚠️ Disconnected from Flask backend');
    });
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const clearSentence = () => {
    setSentence('');
    if (socket) socket.emit('reset_sentence');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <ThemeProvider theme={darkGreenTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register onRegister={setUser} />} />
          <Route path="/" element={user ? <MainPage user={user} socket={socket} sentence={sentence} latestLetter={latestLetter} confidence={confidence} landmarks={landmarks} clearSentence={clearSentence} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
