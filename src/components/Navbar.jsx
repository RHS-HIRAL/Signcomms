import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const navButtonStyle = {
    marginLeft: 12,
    fontWeight: 600,
    fontSize: '1rem',
    borderRadius: 20,
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #39ff14, #00ffc3)',
    color: '#101010',
    boxShadow: '0 0 10px #00ff99',
    textTransform: 'none',
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
      <div className={`navbar ${menuOpen ? 'active' : ''}`} id="navbar" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <a href="/Sign_language" className="menu-btn" data-text="Sign Languages">Sign Languages</a>
        <a href="/about"         className="menu-btn" data-text="About">About</a>
        <a href="https://tech-krunal.github.io/signcomms/team.html" className="menu-btn" data-text="Team">Team</a>
        <a href="/contact"       className="menu-btn" data-text="Contact">Contact</a>
        {!user && (
          <Link to="/login" className="log-btn" data-text="Login">Login</Link>
        )}
        {user && (
          <Button onClick={handleLogout} sx={navButtonStyle} variant="contained">
            Logout
          </Button>
        )}
      </div>
    </>
  );
}

export default Navbar;
