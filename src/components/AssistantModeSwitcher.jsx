import { useMemo, useRef } from "react";
import {
  Briefcase,
  Compass,
  HeartHandshake,
  Stethoscope,
} from "lucide-react";
import "../styles/AssistantModeSwitcher.css";
import { ASSISTANT_MODE_OPTIONS } from "../constants/assistantModes";

const LUCIDE_MODE_ICONS = Object.freeze({
  Briefcase,
  Compass,
  HeartHandshake,
  Stethoscope,
});

const getModeIcon = (icon) => {
  if (icon?.library !== "lucide") return null;
  return LUCIDE_MODE_ICONS[icon.name] ?? null;
};

const normalizeOptions = (options) => {
  const source = Array.isArray(options) && options.length > 0
    ? options
    : ASSISTANT_MODE_OPTIONS;

  return source
    .map((option) => {
      if (typeof option === "string") {
        return {
          value: option.toLowerCase().replace(/\s+/g, "-"),
          label: option,
          description: "",
          icon: null,
          disabled: false,
        };
      }

      const optionValue = option?.value ?? option?.id;
      if (optionValue === undefined || optionValue === null) return null;

      return {
        value: String(optionValue),
        label: option.label ?? option.name ?? String(optionValue),
        description: option.description ?? "",
        icon: option.icon ?? null,
        disabled: Boolean(option.disabled),
      };
    })
    .filter(Boolean);
};

export default function AssistantModeSwitcher({
  value,
  onChange,
  options = ASSISTANT_MODE_OPTIONS,
  ariaLabel = "Assistant mode",
  className = "",
  disabled = false,
}) {
  const buttonRefs = useRef([]);
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);

  if (normalizedOptions.length === 0) return null;

  const requestedIndex = normalizedOptions.findIndex((option) => option.value === value);
  const fallbackIndex = normalizedOptions.findIndex((option) => !option.disabled);
  const selectedIndex = requestedIndex >= 0
    ? requestedIndex
    : Math.max(fallbackIndex, 0);
  const selectedValue = normalizedOptions[selectedIndex]?.value;

  const selectOption = (index) => {
    const option = normalizedOptions[index];
    if (!option || option.disabled || disabled) return;

    onChange?.(option.value);
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (event, currentIndex) => {
    if (disabled) return;

    const enabledIndices = normalizedOptions
      .map((option, index) => (!option.disabled ? index : -1))
      .filter((index) => index >= 0);

    if (enabledIndices.length === 0) return;

    let nextIndex;
    const currentEnabledPosition = Math.max(enabledIndices.indexOf(currentIndex), 0);

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = enabledIndices[(currentEnabledPosition + 1) % enabledIndices.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = enabledIndices[(currentEnabledPosition - 1 + enabledIndices.length) % enabledIndices.length];
    } else if (event.key === "Home") {
      nextIndex = enabledIndices[0];
    } else if (event.key === "End") {
      nextIndex = enabledIndices[enabledIndices.length - 1];
    } else {
      return;
    }

    event.preventDefault();
    selectOption(nextIndex);
  };

  return (
    <div
      className={`assistant-mode-switcher ${className}`.trim()}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-selected-mode={selectedValue}
      style={{
        "--assistant-mode-count": normalizedOptions.length,
        "--assistant-mode-index": selectedIndex,
      }}
    >
      <span className="assistant-mode-switcher__selection" aria-hidden="true" />

      {normalizedOptions.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isDisabled = disabled || option.disabled;
        const ModeIcon = getModeIcon(option.icon);

        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isDisabled || undefined}
            aria-label={option.description ? `${option.label}: ${option.description}` : option.label}
            title={option.description || option.label}
            disabled={isDisabled}
            tabIndex={!isDisabled && isSelected ? 0 : -1}
            className={`assistant-mode-switcher__option ${ModeIcon ? "has-icon" : ""} ${isSelected ? "is-selected" : ""}`.trim()}
            onClick={() => selectOption(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {ModeIcon && (
              <ModeIcon
                className="assistant-mode-switcher__icon"
                size={16}
                strokeWidth={1.9}
                aria-hidden="true"
                focusable="false"
              />
            )}
            <span className="assistant-mode-switcher__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
