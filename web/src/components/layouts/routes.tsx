import { type Flag } from "@/src/features/feature-flags/types";
import { type ProjectScope } from "@langfuse/shared";
import {
  Bot,
  BellRing,
  Workflow,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Search,
  Home,
  Clock,
} from "lucide-react";
import { type ReactNode } from "react";
import { type Entitlement } from "@/src/features/entitlements/constants/entitlements";
import { type Session } from "next-auth";
import { type OrganizationScope } from "@/src/features/rbac/constants/organizationAccessRights";
import { V4MigrationNavItem } from "@/src/features/v4-migration/V4MigrationNavItem";
import { V4SidebarToggle } from "@/src/features/events/components/V4SidebarToggle";
import { SidebarMenuButton } from "@/src/components/ui/sidebar";
import { KeyboardShortcut } from "@/src/components/ui/keyboard-shortcut";
import { useCommandMenu } from "@/src/features/command-k-menu/CommandMenuProvider";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { type ProductModule } from "@/src/ee/features/ui-customization/productModuleSchema";

export enum RouteSection {
  Main = "main",
  Secondary = "secondary",
}

export enum RouteGroup {
  AgentOperations = "Agent Operations",
}

export type Route = {
  title: string;
  menuNode?: ReactNode;
  featureFlag?: Flag;
  label?: string | ReactNode;
  projectRbacScopes?: ProjectScope[]; // array treated as OR
  organizationRbacScope?: OrganizationScope;
  icon?: LucideIcon; // ignored for nested routes
  pathname: string; // link
  items?: Array<Route>; // folder
  section?: RouteSection; // which section of the sidebar (top/main/bottom)
  newTab?: boolean; // open in new tab
  entitlements?: Entitlement[]; // entitlements required, array treated as OR
  productModule?: ProductModule; // Product module this route belongs to. Used to show/hide modules via ui customization.
  show?: (p: {
    organization:
      | NonNullable<Session["user"]>["organizations"][number]
      | undefined;
    projectId: string | undefined;
    isLangfuseCloud: boolean;
    v4WriteMode: undefined | "legacy" | "dual" | "events_only"; // undefined until the session has loaded
  }) => boolean;
  group?: RouteGroup; // group this route belongs to (within a section)
};

export const ROUTES: Route[] = [
  {
    title: "Go to...",
    pathname: "", // Empty pathname since this is a dropdown
    icon: Search,
    menuNode: <CommandMenuTrigger />,
    section: RouteSection.Main,
  },
  {
    title: "Dashboard",
    pathname: `/project/[projectId]`,
    icon: Home,
    section: RouteSection.Main,
  },
  {
    title: "Dashboards",
    pathname: `/project/[projectId]/dashboards`,
    icon: LayoutDashboard,
    productModule: "dashboards",
    section: RouteSection.Main,
  },
  {
    title: "Agents",
    icon: Bot,
    group: RouteGroup.AgentOperations,
    section: RouteSection.Main,
    pathname: `/project/[projectId]/agents`,
  },
  {
    title: "Runs",
    icon: Workflow,
    productModule: "tracing",
    group: RouteGroup.AgentOperations,
    section: RouteSection.Main,
    pathname: `/project/[projectId]/runs`,
  },
  {
    title: "Execution Groups",
    icon: Clock,
    productModule: "tracing",
    group: RouteGroup.AgentOperations,
    section: RouteSection.Main,
    pathname: `/project/[projectId]/sessions`,
  },
  {
    title: "Monitors",
    pathname: "/project/[projectId]/monitors",
    icon: BellRing,
    projectRbacScopes: ["monitors:read"],
    show: ({ v4WriteMode }) => Boolean(v4WriteMode) && v4WriteMode !== "legacy",
    group: RouteGroup.AgentOperations,
    section: RouteSection.Main,
  },
  {
    title: "Automations",
    pathname: `/project/[projectId]/automations`,
    icon: Workflow,
    projectRbacScopes: ["automations:read"],
    group: RouteGroup.AgentOperations,
    section: RouteSection.Main,
  },
  {
    title: "Preview (fast)",
    pathname: "",
    section: RouteSection.Secondary,
    featureFlag: "v4BetaToggleVisible",
    menuNode: <V4SidebarToggle />,
  },
  {
    title: "Update",
    pathname: "",
    section: RouteSection.Secondary,
    featureFlag: "v4UpgradeUi",
    show: ({ projectId }) => projectId !== undefined,
    menuNode: <V4MigrationNavItem />,
  },
  {
    title: "Settings",
    pathname: "/project/[projectId]/settings",
    icon: Settings,
    section: RouteSection.Secondary,
  },
];

function CommandMenuTrigger() {
  const { setOpen } = useCommandMenu();
  const capture = usePostHogClientCapture();

  return (
    <SidebarMenuButton
      onClick={() => {
        capture("cmd_k_menu:opened", {
          source: "main_navigation",
        });
        setOpen(true);
      }}
      className="whitespace-nowrap"
    >
      <Search className="h-4 w-4" />
      Go to...
      <KeyboardShortcut
        className="ml-auto"
        keys={[navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl", "K"]}
      />
    </SidebarMenuButton>
  );
}
