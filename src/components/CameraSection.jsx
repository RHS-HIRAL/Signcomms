import React, { useEffect, useRef, useState } from 'react';
import useScrollAnimation from '../hooks/useScrollAnimation';
import { io } from 'socket.io-client';

const socket = io("http://localhost:5000"); // Update to your backend address if needed

function CameraSection() {
  const videoRef = useRef(null);
  const cameraSectionRef = useRef(null);
  const [latestLetter, setLatestLetter] = useState('');
  const [sentence, setSentence] = useState('');

  const startRecognition = async () => {
    cameraSectionRef.current.style.display = 'block';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          deviceId: { exact: 1 } // Specify camera index 1
        }
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
  
      // Start frame capture
      startSendingFrames();
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };
  
  const stopRecognition = () => {
    const stream = videoRef.current.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    videoRef.current.srcObject = null;
    cameraSectionRef.current.style.display = 'none';
    clearInterval(frameIntervalRef.current);
  };
  
  const frameIntervalRef = useRef(null);
  
  const startSendingFrames = () => {
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
  
    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
  
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
      const imageData = canvas.toDataURL('image/jpeg');
      socket.emit('frame', imageData);
    }, 300); // Every 300ms
  };
  
  useEffect(() => {
    socket.on('connect', () => console.log('[SocketIO] Connected:', socket.id));
    socket.on('disconnect', () => console.log('[SocketIO] Disconnected'));  
    socket.on('prediction', (data) => {
      if (data.letter) setLatestLetter(data.letter);
      if (data.sentence) setSentence(data.sentence);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('prediction');
    };
  }, []);

  useScrollAnimation();

  return (
    <div id="camera-section-scroll scroll-fade">
      <div className="camera-wrapper">
        <div className="button-group">
          <button className="btn pulse" onClick={startRecognition}>Start Recognition</button>
          <button className="btn pulse" onClick={stopRecognition}>Stop Recognition</button>
        </div>

        <div className="camera-section" ref={cameraSectionRef} style={{ display: 'none' }}>
          <h3>Camera View:</h3>
          <video id="video" ref={videoRef} width="840" height="480" autoPlay muted playsInline></video>
          <div className="prediction-box">
            <h4>Detected Letter: <span style={{ fontWeight: 'bold' }}>{latestLetter}</span></h4>
            <h4>Sentence: <span style={{ fontWeight: 'bold' }}>{sentence}</span></h4>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraSection;
