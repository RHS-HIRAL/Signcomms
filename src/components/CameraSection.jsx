import React, { useEffect, useRef, useState } from 'react';
import useScrollAnimation from '../hooks/useScrollAnimation';
import cameraSwitchIcon from '../images/camera-switch.png';

function CameraSection({ socket, latestLetter, confidence, landmarks }) {
  const videoRef = useRef(null);
  const cameraSectionRef = useRef(null);
  const canvasRef = useRef(null);
  const [fps, setFps] = useState(0);
  const frameIntervalRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [currentDevice, setCurrentDevice] = useState(0);

  // Live detected letters (last 5, fade out after 1s)
  const [liveLetters, setLiveLetters] = useState([]); // [{letter, id, timestamp}]
  // Top 3 probable letters
  const [topLetters, setTopLetters] = useState([]); // [{letter, confidence}]

  // Add a basic English word list (short sample, can be expanded)
  const WORD_LIST = [
    'HELLO', 'HELP', 'WORLD', 'SIGN', 'LANGUAGE', 'PYTHON', 'PROJECT', 'HAND', 'LOVE', 'PEACE',
    'GOOD', 'BAD', 'YES', 'NO', 'PLEASE', 'THANK', 'YOU', 'FRIEND', 'FAMILY', 'COMPUTER',
    'AI', 'MODEL', 'CAMERA', 'LETTER', 'WORD', 'RECOMMEND', 'SELECT', 'SENTENCE', 'DETECT', 'CONFIDENCE'
  ];

  // Track the final sentence
  const [sentence, setSentence] = useState('');

  // Limit live detected letters to 2 per second
  const lastLiveLetterTime = useRef(0);

  // Add a state for live landmarks
  const [liveLandmarks, setLiveLandmarks] = useState([]);

  // Listen for live_prediction event
  useEffect(() => {
    if (!socket) return;
    const handleLivePrediction = (data) => {
      const now = Date.now();
      if (now - lastLiveLetterTime.current < 500) return; // 2 per second
      lastLiveLetterTime.current = now;
      if (data && data.live_letter) {
        const id = now + Math.random();
        setLiveLetters((prev) => {
          const updated = [...prev, { letter: data.live_letter, id }];
          // Only keep last 3
          return updated.slice(-3);
        });
        setTopLetters(data.top_letters || []);
        setTimeout(() => {
          setLiveLetters((prev) => prev.filter((l) => l.id !== id));
        }, 1000);
      }
      if (data && data.landmarks) {
        setLiveLandmarks(data.landmarks);
      }
    };
    socket.on('live_prediction', handleLivePrediction);
    return () => socket.off('live_prediction', handleLivePrediction);
  }, [socket]);

  // Clear live letters on stop/reset or stable letter
  useEffect(() => {
    if (!latestLetter) setLiveLetters([]);
  }, [latestLetter]);

  // Get available video input devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
    });
  }, []);

  // Start video stream from selected device
  const startRecognition = async () => {
    cameraSectionRef.current.style.display = 'block';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: devices.length > 0 ? { exact: devices[currentDevice].deviceId } : undefined } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      startSendingFrames();
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  // Switch camera
  const handleSwitchCamera = async () => {
    if (devices.length < 2) return;
    const nextDevice = (currentDevice + 1) % devices.length;
    setCurrentDevice(nextDevice);
    // Stop current stream
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    // Start new stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: devices[nextDevice].deviceId } } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      startSendingFrames();
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  // If currentDevice changes, restart stream if camera is open
  useEffect(() => {
    if (cameraSectionRef.current && cameraSectionRef.current.style.display === 'block') {
      startRecognition();
    }
    // eslint-disable-next-line
  }, [currentDevice]);

  const stopRecognition = () => {
    const stream = videoRef.current.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    videoRef.current.srcObject = null;
    cameraSectionRef.current.style.display = 'none';
    clearInterval(frameIntervalRef.current);
    setFps(0);
  };

  const startSendingFrames = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
      const now = performance.now();
      if (lastFrameTimeRef.current) {
        const delta = now - lastFrameTimeRef.current;
        if (delta > 0) setFps(Math.round(1000 / delta));
      }
      lastFrameTimeRef.current = now;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      if (socket) socket.emit('frame', imageData);
    }, 300);
  };

  // Draw hand landmarks and connections on overlay canvas (use liveLandmarks if available)
  useEffect(() => {
    const lm = liveLandmarks.length > 0 ? liveLandmarks : landmarks;
    if (!lm || !canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (lm.length > 0 && videoRef.current.videoWidth > 0) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      // Draw connections (lines)
      const HAND_CONNECTIONS = [
        [0,1],[1,2],[2,3],[3,4],      // Thumb
        [0,5],[5,6],[6,7],[7,8],      // Index
        [5,9],[9,10],[10,11],[11,12], // Middle
        [9,13],[13,14],[14,15],[15,16], // Ring
        [13,17],[17,18],[18,19],[19,20], // Pinky
        [0,17] // Palm base to pinky base
      ];
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        if (lm[start] && lm[end]) {
          ctx.beginPath();
          ctx.moveTo(lm[start][0] * canvas.width, lm[start][1] * canvas.height);
          ctx.lineTo(lm[end][0] * canvas.width, lm[end][1] * canvas.height);
          ctx.stroke();
        }
      });
      // Draw landmarks (red dots)
      ctx.fillStyle = '#ff2222';
      lm.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * canvas.width, y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }, [liveLandmarks, landmarks, videoRef.current?.videoWidth, videoRef.current?.videoHeight]);

  useEffect(() => {
    // Clean up interval on unmount
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, []);

  useScrollAnimation();

  // Get the last word being typed
  const getLastWord = () => {
    const words = sentence.trim().split(/\s+/);
    return words[words.length - 1] || '';
  };

  // Recommend words based on last word and sentence
  const recommendWords = () => {
    const lastWord = getLastWord();
    const upperSentence = sentence.trim().toUpperCase();
    // Recommend words that start with lastWord or are contained in the sentence
    const recs = WORD_LIST.filter(w =>
      (lastWord && w.startsWith(lastWord.toUpperCase())) ||
      (upperSentence && w.startsWith(upperSentence.replace(/\s/g, '')))
    );
    return recs.slice(0, 5);
  };

  const handleWordClick = (word) => {
    // Replace the last word in the sentence with the selected word
    setSentence((prev) => {
      const words = prev.trim().split(/\s+/);
      words[words.length - 1] = word;
      return words.join(' ') + ' ';
    });
  };

  return (
    <div id="camera-section-scroll scroll-fade">
      <div className="camera-wrapper">
        <div className="button-group">
          <button className="btn pulse" onClick={startRecognition}>Start Recognition</button>
          <button className="btn pulse" onClick={stopRecognition}>Stop Recognition</button>
        </div>
        <div className="camera-section" ref={cameraSectionRef} style={{ display: 'none' }}>
          <h3>Camera View:</h3>
          {/* Live detected letters above camera */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            minHeight: 40,
            marginBottom: 8,
            fontSize: '2.2rem',
            fontWeight: 700,
            letterSpacing: 2,
            color: '#00ffc3',
            transition: 'opacity 0.5s',
          }}>
            {liveLetters.map((l) => (
              <span key={l.id} style={{ opacity: 1, transition: 'opacity 0.5s' }}>{l.letter}</span>
            ))}
          </div>
          {/* Camera and overlays in a relative container */}
          <div style={{ position: 'relative', width: 840, height: 480, marginBottom: 16 }}>
            <video
              id="video"
              ref={videoRef}
              width="840"
              height="480"
              autoPlay
              muted
              playsInline
              style={{ display: 'block', width: 840, height: 480, background: '#000', borderRadius: 8 }}
            ></video>
            {/* Camera switch button */}
            {devices.length > 1 && (
              <button
                onClick={handleSwitchCamera}
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  zIndex: 10,
                  background: '#7CFC98', // light green
                  border: 'none',
                  borderRadius: '50%',
                  padding: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'background 0.2s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Switch Camera"
              >
                <img src={cameraSwitchIcon} alt="Switch Camera" style={{ width: 28, height: 28 }} />
              </button>
            )}
            <canvas
              ref={canvasRef}
              width={840}
              height={480}
              style={{ position: 'absolute', left: 0, top: 0, zIndex: 2, pointerEvents: 'none', width: 840, height: 480 }}
            />
            {/* Top probable letters bar under camera */}
            {topLetters.length > 0 && (
              <div style={{
                position: 'absolute',
                left: '50%',
                bottom: -48,
                transform: 'translateX(-50%)',
                width: 400,
                background: 'rgba(0,0,0,0.7)',
                borderRadius: 12,
                padding: 8,
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                gap: 12,
                zIndex: 5,
              }}>
                {topLetters.map((t) => (
                  <div key={t.letter} style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontWeight: 700, color: '#39ff14', fontSize: '1.3rem' }}>{t.letter}</div>
                    <div style={{
                      height: 8,
                      width: 48,
                      background: '#222',
                      borderRadius: 4,
                      margin: '4px auto',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.round(t.confidence * 100)}%`,
                        height: '100%',
                        background: '#00ffc3',
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }}></div>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#e5ffe1' }}>{Math.round(t.confidence * 100)}%</div>
                  </div>
                ))}
              </div>
            )}
            {/* Overlay live letter (stable) */}
            {latestLetter && (
              <div style={{ position: 'absolute', left: '50%', top: '10%', transform: 'translateX(-50%)', zIndex: 3, fontSize: '3rem', color: '#fff', textShadow: '2px 2px 8px #000' }}>
                {latestLetter}
              </div>
            )}
            {/* FPS/latency (right) */}
            <div style={{ position: 'absolute', right: 10, top: 10, zIndex: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '1rem' }}>
              FPS: {fps}
            </div>
            {/* Confidence bar (left) */}
            {confidence !== null && (
              <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '1rem', width: '120px' }}>
                <div style={{ marginBottom: 2 }}>Confidence</div>
                <div style={{ background: '#333', borderRadius: '4px', height: '10px', width: '100%' }}>
                  <div style={{ background: '#4caf50', width: `${Math.round(confidence * 100)}%`, height: '100%', borderRadius: '4px' }}></div>
                </div>
                <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{Math.round(confidence * 100)}%</div>
              </div>
            )}
          </div>
          {/* Below the camera, add word recommendations */}
          {recommendWords().length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              margin: '18px 0 0 0',
              flexWrap: 'wrap',
            }}>
              {recommendWords().map(word => (
                <button
                  key={word}
                  onClick={() => handleWordClick(word)}
                  style={{
                    background: 'linear-gradient(135deg, #39ff14, #00ffc3)',
                    color: '#101010',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 16,
                    padding: '8px 18px',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 8px #00ff99',
                    margin: '2px 0',
                    transition: 'background 0.2s',
                  }}
                >
                  {word}
                </button>
              ))}
            </div>
          )}
          {/* Prediction box and sentence below camera */}
          {/* <div className="prediction-box" style={{ marginTop: 8 }}>
            <h4>Detected Letter: <span style={{ fontWeight: 'bold' }}>{latestLetter}</span></h4>
            <h4>Sentence: <span style={{ fontWeight: 'bold' }}>{sentence}</span></h4>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default CameraSection;
