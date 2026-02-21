import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TopNav } from "../components/TopNav";

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Play: () => <span data-testid="play-icon" />,
  Code2: () => <span data-testid="code-icon" />,
  Moon: () => <span data-testid="moon-icon" />,
  Sun: () => <span data-testid="sun-icon" />,
  Share2: () => <span data-testid="share-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  MessageSquare: () => <span data-testid="msg-icon" />,
  Wifi: () => <span data-testid="wifi-icon" />,
  WifiOff: () => <span data-testid="wifi-off-icon" />,
  WandSparkles: () => <span data-testid="format-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  User: () => <span data-testid="user-icon" />,
}));

// Mock ParticipantsList
vi.mock("../components/ParticipantsList", () => ({
  ParticipantsList: () => <span data-testid="participants" />,
}));

describe("TopNav Component", () => {
  it("renders correctly", () => {
    const props = {
      language: "javascript",
      setLanguage: vi.fn(),
      isRunning: false,
      onRun: vi.fn(),
      theme: "dark",
      toggleTheme: vi.fn(),
    };

    render(<TopNav {...props} />);

    expect(screen.getByText("CodeStream")).toBeInTheDocument();
    expect(screen.getByText("Run Code")).toBeInTheDocument();
  });

  it("handles run button click", () => {
    const onRun = vi.fn();
    const props = {
      language: "javascript",
      setLanguage: vi.fn(),
      isRunning: false,
      onRun,
      theme: "dark",
      toggleTheme: vi.fn(),
    };

    render(<TopNav {...props} />);

    fireEvent.click(screen.getByText("Run Code"));
    expect(onRun).toHaveBeenCalled();
  });

  it("disables run button when running", () => {
    const props = {
      language: "javascript",
      setLanguage: vi.fn(),
      isRunning: true,
      onRun: vi.fn(),
      theme: "dark",
      toggleTheme: vi.fn(),
    };

    render(<TopNav {...props} />);

    const button = screen.getByText(/Running/);
    expect(button.closest("button")).toBeDisabled();
  });
});
