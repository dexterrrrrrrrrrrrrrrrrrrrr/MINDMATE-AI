import SpeechRecognition from "react-speech-recognition";

export const microphoneConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const getMicrophoneErrorMessage = (error) => {
  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return "Microphone access requires HTTPS.";
  }

  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Please allow microphone access and try again.";
  }

  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "No microphone was found.";
  }

  return error?.message || "Unable to access the microphone. Please try again.";
};

export const openMicrophoneStream = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone input is not supported in this browser.");
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    throw new DOMException("Microphone access requires HTTPS.", "SecurityError");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: microphoneConstraints,
  });
};

export const requestMicrophonePermission = async () => {
  // Resolve permission from the click gesture before starting Web Speech. This
  // prevents the first attempt being consumed by the permission prompt.
  const permissionStream = await openMicrophoneStream();

  permissionStream.getTracks().forEach((track) => track.stop());
};

export const startSpeechListening = async (options = {}) => {
  await requestMicrophonePermission();

  await SpeechRecognition.startListening(options);
};
