import React, { useState } from 'react';
// import { Link } from 'react-router-dom'; // We will setup Router soon

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      {/* Logo */}
      <div className="logo">
        <a href="/">
          <div id = "logo-div">
          {/* <img src="src/images/logo2.svg" alt="SignComms Logo" className="logo-img" /> */}
          <img src="src/images/s.svg" alt="SignComms Logo" className="logo-img" />
          </div>
        </a>
      </div>

      {/* Menu icon for smaller screens */}
      <div className="menu-icon" onClick={toggleMenu}>
        &#9776;
      </div>

      {/* Navbar links */}
      <div className={`navbar ${menuOpen ? 'active' : ''}`} id="navbar">
      <a href="/Sign_language" className="menu-btn" data-text="Sign Languages">Sign Languages</a>
      <a href="/about"         className="menu-btn" data-text="About">About</a>
      <a href="https://tech-krunal.github.io/signcomms/team.html"          className="menu-btn" data-text="Team">Team</a>
      <a href="/contact"       className="menu-btn" data-text="Contact">Contact</a>
      <a href="/signin"        className="log-btn"  data-text="Login">Login</a>
      </div>
    </>
  );
}

export default Navbar;
