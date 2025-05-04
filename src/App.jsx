import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import CameraSection from './components/CameraSection';
import OutputSection from './components/OutputSection';
import Footer from './components/Footer';

function App() {
  const [sentence, setSentence] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('✅ Connected to Flask Socket.IO backend');
    });

    newSocket.on('prediction', (data) => {
      if (data && data.sentence) {
        setSentence(data.sentence);
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

  return (
    <>
      <Navbar />
      <HeroSection />
      <CameraSection socket={socket} />
      <OutputSection sentence={sentence} />
      <Footer />
    </>
  );
}

export default App;



// import React, { useState, useEffect } from 'react';
// import { io } from 'socket.io-client';

// import Navbar from './components/Navbar';
// import HeroSection from './components/HeroSection';
// import CameraSection from './components/CameraSection';
// import OutputSection from './components/OutputSection';
// import Footer from './components/Footer';

// function App() {
//   const [sentence, setSentence] = useState('');

//   useEffect(() => {
//     const socket = io('http://localhost:5000'); // Connect to Flask backend

//     socket.on('connect', () => {
//       console.log('✅ Connected to Flask Socket.IO backend');
//     });

//     socket.on('prediction', (data) => {
//       if (data && data.sentence) {
//         setSentence(data.sentence); // Update sentence from backend
//       }
//     });

//     socket.on('disconnect', () => {
//       console.warn('⚠️ Disconnected from Flask backend');
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, []);

//   return (
//     <>
//       <Navbar />
//       <HeroSection />
//       <CameraSection />
//       <OutputSection sentence={sentence} />
//       <Footer />
//     </>
//   );
// }

// export default App;




