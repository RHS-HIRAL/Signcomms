import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import CameraSection from './components/CameraSection';
import OutputSection from './components/OutputSection';
import Footer from './components/Footer';

function App() {
  const [sentence, setSentence] = useState('');
  const [latestLetter, setLatestLetter] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [socket, setSocket] = useState(null);

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

  return (
    <>
      <Navbar />
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

export default App;
