import { getAssistantMode } from "../constants/assistantModes";

const API_ROLES = new Set(["user", "model"]);

const normalizeMessages = (messages) => (
  Array.isArray(messages)
    ? messages
      .filter((message) => API_ROLES.has(message?.role) && typeof message.content === "string")
      .map((message) => ({ role: message.role, content: message.content.trim() }))
      .filter((message) => message.content.length > 0)
    : []
);

export const buildModeAwareMessages = ({
  modeId,
  messages,
  taskInstruction = "",
}) => {
  const normalizedMessages = normalizeMessages(messages);
  let latestUserIndex = -1;
  for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
    if (normalizedMessages[index].role === "user") {
      latestUserIndex = index;
      break;
    }
  }

  if (latestUserIndex < 0) return normalizedMessages;

  const mode = getAssistantMode(modeId);
  const task = typeof taskInstruction === "string" ? taskInstruction.trim() : "";
  const responseGuide = [
    `The user selected ${mode.label} mode in the MindMate interface.`,
    "For this reply, follow the response guide below without mentioning the mode instructions themselves.",
    mode.systemInstruction,
    task,
  ].filter(Boolean).join("\n\n");

  return normalizedMessages.map((message, index) => (
    index === latestUserIndex
      ? {
          ...message,
          content: `${responseGuide}\n\nUser request:\n${message.content}`,
        }
      : message
  ));
};
