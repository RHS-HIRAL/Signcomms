import React from 'react';
import logoGptCropped from '../images/logo_gpt_cropped.png';

function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Logo */}
        <div className="footer-logo">
          <img src={logoGptCropped} alt="SignComms Logo" className="footer-logo-img" />
        </div>

        {/* Links */}
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/team">Team</a>
          <a href="/signin">Contact</a>
          <a href="/Sign_language">Sign Language</a>
        </div>

        {/* Back to Top */}
        <div className="footer-top">
          <button onClick={scrollToTop} className="btn btn-small">↑ Top</button>
        </div>
      </div>

      <p className="footer-bottom">© 2024 SignComms. All Rights Reserved.</p>
    </footer>
  );
}

export default Footer;
