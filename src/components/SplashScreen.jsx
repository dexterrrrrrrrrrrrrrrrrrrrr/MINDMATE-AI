import React, { useEffect } from "react";
import "../styles/SplashScreen.css";
import logo from "../assets/logo.jpg"; // Rename your uploaded file to `logo.jpg` and place in /src/assets

const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <img src={logo} alt="Vital Sense Logo" className="splash-logo" />
      <h1 className="animated-text">Vital Sense</h1>
      <p className="splash-tagline">Your emotionally intelligent AI companion</p>
    </div>
  );
};

export default SplashScreen;
