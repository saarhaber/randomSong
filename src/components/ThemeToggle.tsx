import type { ThemeMode } from "../theme";

type ThemeToggleProps = {
  theme: ThemeMode;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={onToggle} aria-label={label} title={label}>
      {theme === "dark" ? (
        <span className="theme-toggle__icon" aria-hidden>
          ☀
        </span>
      ) : (
        <span className="theme-toggle__icon" aria-hidden>
          ☽
        </span>
      )}
    </button>
  );
}
