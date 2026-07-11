// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VenueMapFallback } from "./VillageScreens";

describe("VenueMapFallback", () => {
  it("shows only the list contract while positions are uncalibrated", () => {
    const geolocation = { getCurrentPosition: vi.fn() };
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: geolocation });
    const { container } = render(<VenueMapFallback onList={vi.fn()} />);
    expect(screen.getByText(/推測したピンを表示しません/)).toBeInTheDocument();
    expect(container.querySelectorAll("[style*='left:']")).toHaveLength(0);
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
});
