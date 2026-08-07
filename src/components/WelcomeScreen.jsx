import React from "react";
import { getAssistantMode } from "../constants/assistantModes";
import "../styles/App.css";

const WelcomeScreen = ({ user, mode }) => {
  const firstName = user?.displayName?.split(" ")[0] || "there";
  const activeMode = getAssistantMode(mode);
  const message = activeMode.welcomeMessage.replaceAll("{name}", firstName);

  return (
    <div className="welcome-container">
      <p className="welcome-mode-label">{activeMode.label} mode</p>
      <h1 className="welcome-text">{message}</h1>
    </div>
  );
};

export default WelcomeScreen;
