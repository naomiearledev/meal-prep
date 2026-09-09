import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Without Vitest globals, Testing Library cannot register its own cleanup.
afterEach(cleanup);
