import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Placeholder — replace with real component tests as they are added.
describe("test runner", () => {
    it("works", () => {
        render(<p>hello</p>);
        expect(screen.getByText("hello")).toBeInTheDocument();
    });
});
