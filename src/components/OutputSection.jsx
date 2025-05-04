import React, { useState, useEffect } from 'react';
import useScrollAnimation from '../hooks/useScrollAnimation';

const translations = {
  english: "Hello!",
  hindi: "नमस्कार",
  es: "¡Hola!",
  fr: "Bonjour!",
  de: "Hallo!",
  pa: "punjabi",
  ru: "Здравствуйте",
  ar: "مرحبا",
  ja: "こんにちは",
  ko: "안녕하세요"
};

function OutputSection({ sentence }) {
  const [language, setLanguage] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);

  useScrollAnimation();

  useEffect(() => {
      setAudioUrl(null);
    }, [sentence, language]);
    
  // Fetch translation from Flask backend
  useEffect(() => {
    if (!sentence) return;

    const fetchTranslation = async () => {
      // setAudioUrl(null);
      try {
        const res = await fetch('http://localhost:5000/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sentence, language }),
        });
        const data = await res.json();
        setTranslatedText(data.translated || sentence);
      } catch (err) {
        console.error("Translation error:", err);
        setTranslatedText(sentence);
      }
    };

    fetchTranslation();
  }, [sentence, language]);

  // Generate and play TTS from backend
  const playSpeech = async () => {
    try {
      const res = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: translatedText, language }),
      });
      const data = await res.json();

      if (data.audio_url) {
        const audio = new Audio(`http://localhost:5000${data.audio_url}`);
        audio.play();
        setAudioUrl(`http://localhost:5000${data.audio_url}`);
      } else {
        console.warn("No audio generated:", data.error);
      }
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  return (
    <div className="output-card scroll-fade">
      <div className="output">
        <h3>Detected Sign (Sentence):</h3>
        <div id="detected-sign" className="result">
          {sentence || "✋ Waiting for input..."}
        </div>

        <div className="translation-section">
          <h3>Translated Text:</h3>
          <select
            id="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {Object.entries(translations).map(([code]) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div id="translated-text" className="result">{translatedText}</div>

        <h3>Text-to-Speech:</h3>
        <div id="tts-result" className="result">Click to play translation...</div>
        <button className="btn pulse" onClick={playSpeech}>Play Speech</button>

        {/* Optional audio download button */}
        {audioUrl && (
          <a href={audioUrl} download="translation.mp3" className="btn pulse" style={{ marginTop: '1rem' }}>
            Download Audio
          </a>
        )}
      </div>
    </div>
  );
}

export default OutputSection;



// import React, { useState, useEffect } from 'react';
// import useScrollAnimation from '../hooks/useScrollAnimation';

// const translations = {
//   en: "Hello!",
//   hi: "नमस्कार",
//   es: "¡Hola!",
//   fr: "Bonjour!",
//   de: "Hallo!",
//   zh: "你好",
//   ru: "Здравствуйте",
//   ar: "مرحبا",
//   ja: "こんにちは",
//   ko: "안녕하세요"
// };

// function OutputSection({ sentence }) {
//   const [language, setLanguage] = useState('en');
//   const [translatedText, setTranslatedText] = useState('');
  
//   useScrollAnimation();

//   // Auto-translate sentence when sentence or language changes
//   useEffect(() => {
//     if (!sentence) return;
  
//     const fetchTranslation = async () => {
//       try {
//         const res = await fetch('http://localhost:5000/translate', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ text: sentence, language }),
//         });
//         const data = await res.json();
//         setTranslatedText(data.translated || sentence);
//       } catch (err) {
//         console.error("Translation error:", err);
//         setTranslatedText(sentence);
//       }
//     };
  
//     fetchTranslation();
//   }, [sentence, language]);
  

//   const playSpeech = () => {
//     const speech = new SpeechSynthesisUtterance(translatedText);
//     speech.lang = language;
//     window.speechSynthesis.speak(speech);
//   };

//   return (
//     <div className="output-card scroll-fade">
//       <div className="output">
//         <h3>Detected Sign (Sentence):</h3>
//         <div id="detected-sign" className="result">
//           {sentence || "✋ Waiting for input..."}
//         </div>

//         <div className="translation-section">
//           <h3>Translated Text:</h3>
//           <select
//             id="language-selector"
//             value={language}
//             onChange={(e) => setLanguage(e.target.value)}
//           >
//             {Object.entries(translations).map(([code, word]) => (
//               <option key={code} value={code}>
//                 {code.toUpperCase()}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div id="translated-text" className="result">{translatedText}</div>

//         <h3>Text-to-Speech:</h3>
//         <div id="tts-result" className="result">Click to play translation...</div>
//         <button className="btn pulse" onClick={playSpeech}>Play Speech</button>
//       </div>
//     </div>
//   );
// }

// export default OutputSection;



// import React, { useState } from 'react';
// import useScrollAnimation from '../hooks/useScrollAnimation';

// const translations = {
//   en: "Hello!",
//   hi: "नमस्कार",
//   es: "¡Hola!",
//   fr: "Bonjour!",
//   de: "Hallo!",
//   zh: "你好",
//   ru: "Здравствуйте",
//   ar: "مرحبا",
//   ja: "こんにちは",
//   ko: "안녕하세요"
// };

// function OutputSection() {
//   const [language, setLanguage] = useState('en');
//   const [translatedText, setTranslatedText] = useState(translations['en']);
//   const [detectedSign, setDetectedSign] = useState("✋ Hand Sign Detected");

//   const handleLanguageChange = (e) => {
//     const selectedLang = e.target.value;
//     setLanguage(selectedLang);
//     setTranslatedText(translations[selectedLang]);
//   };

//   const playSpeech = () => {
//     const speech = new SpeechSynthesisUtterance(translatedText);
//     speech.lang = language;
//     window.speechSynthesis.speak(speech);
//   };

//   useScrollAnimation();
//   return (
//     <div className="output-card ">
//     <div className="output">
//       <h3>Detected Sign:</h3>
//       <div id="detected-sign" className="result">{detectedSign}</div>

//       <div className="translation-section">
//         <h3>Translated Text:</h3>
//         <select id="language-selector" value={language} onChange={handleLanguageChange}>
//           <option value="en">English</option>
//           <option value="hi">Hindi</option>
//           <option value="es">Spanish</option>
//           <option value="fr">French</option>
//           <option value="de">German</option>
//           <option value="zh">Chinese</option>
//           <option value="ru">Russian</option>
//           <option value="ar">Arabic</option>
//           <option value="ja">Japanese</option>
//           <option value="ko">Korean</option>
//         </select>
//       </div>

//       <div id="translated-text" className="result">{translatedText}</div>

//       <h3>Text-to-Speech:</h3>
//       <div id="tts-result" className="result">Click to play translation...</div>
//       <button className="btn pulse" onClick={playSpeech}>Play Speech</button>
//     </div>
//     </div>
//   );
// }

// export default OutputSection;
