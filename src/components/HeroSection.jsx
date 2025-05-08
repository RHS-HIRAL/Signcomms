// import React from 'react';

// function HeroSection() {
//   return (
//     <>
//     <div className="container">
//     <header> 
//         {/* className="container"> */}
//       <h1 className="glow">SignComms</h1>
//       <p className="subtitle">Real-Time Hand Sign to Text & Speech Converter</p>
    

//       <div className="section">
//         <h2>Welcome to SignComms</h2>
//         <p>Translate hand signs into text and speech effortlessly.</p>

//         <button className="btn" onClick={() => console.log("Start clicked")}>
//           Start Recognition
//         </button>

//         <button className="btn" onClick={() => console.log("Stop clicked")}>
//           Stop Recognition
//         </button>
//       </div></header></div>
//     </>
//   );
// }

// export default HeroSection;

import React from 'react';

function HeroSection() {
  const scrollToCamera = () => {
    const section = document.getElementById('camera-section-scroll scroll-fade');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="hero-section">
      <div className="hero-content">
        {/* <h1 className="glow animate-zoom">SignComms</h1> */}
        {/* <h1 className="glow animate-type">SignComms  ...<span className="cursor"> |</span></h1> */}
        <h1 className="glow animate-type gradient-text">SignComms</h1>
        <p className="subtitle animate-fade gradient-text">Real-Time Hand Sign to Text & Speech Converter</p>
      </div>

      <div className="hero-action">
        <button className="btn pulse" onClick={scrollToCamera}>Start Recognition</button>
      </div>
    </header>
  );
}

export default HeroSection;
