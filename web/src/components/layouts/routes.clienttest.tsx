import { describe, expect, it } from "vitest";
import { ROUTES } from "./routes";

const routeTitles = ROUTES.map((route) => route.title);
const routePathnames = ROUTES.map((route) => route.pathname);

describe("Langpluse navigation", () => {
  it("exposes the agent execution surfaces", () => {
    expect(routeTitles).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Dashboards",
        "Runs",
        "Execution Groups",
        "Monitors",
        "Automations",
        "Settings",
      ]),
    );
  });

  it("does not expose legacy-first product surfaces", () => {
    expect(routeTitles).not.toEqual(
      expect.arrayContaining([
        "Organizations",
        "Prompts",
        "Playground",
        "Scores",
        "Evaluators",
        "Human Annotation",
        "Datasets",
        "Experiments",
        "Upgrade",
        "Support",
      ]),
    );
    expect(routePathnames).not.toEqual(
      expect.arrayContaining([
        "/organization/[organizationId]",
        "/project/[projectId]/settings/billing",
      ]),
    );
  });
});
