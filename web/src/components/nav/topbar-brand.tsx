import { cn } from "@/src/utils/tailwind";
import Link from "next/link";
import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { PlusIcon } from "lucide-react";
import { LangfuseIcon } from "@/src/components/design-system/LangfuseIcon/LangfuseIcon";
import { useHasAppSidebar } from "@/src/components/nav/sidebar-presence";
import { PRODUCT_NAME } from "@/src/constants";

/**
 * Compact Langfuse brand mark for the top bar.
 *
 * The primary brand lives in the sidebar header. Once the sidebar goes
 * off-canvas (below `md`, where it collapses into a Sheet) nothing brands the
 * app, so the page header renders this compact mark instead — mirroring the
 * icon the sidebar itself shows when collapsed.
 *
 * `variant="icon"` (default) renders just the Langfuse mark; `variant="wordmark"`
 * renders the full logotype, for the centered brand in the mobile top bar.
 *
 * Respects the self-host UI-customization logo entitlement, same as
 * `LangfuseLogo`, and links to `/` like the sidebar logo.
 */
export const TopbarBrand = ({
  className,
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "wordmark";
}) => {
  const hasAppSidebar = useHasAppSidebar();
  const uiCustomization = useUiCustomization();
  const logoLight = uiCustomization?.logoLightModeHref;
  const logoDark = uiCustomization?.logoDarkModeHref;

  // Only brand where a real sidebar exists to mirror. On the sidebar-less
  // MinimalLayout (public/shared trace & session views) the page supplies its
  // own "Sign in / Back to Langfuse" leadingControl, so an extra brand mark
  // here would be redundant.
  if (!hasAppSidebar) return null;

  return (
    <Link
      href="/"
      aria-label={`${PRODUCT_NAME} home`}
      className={cn("flex shrink-0 items-center gap-1", className)}
    >
      {logoLight && logoDark ? (
        // Custom logo (max aspect ratio 1:3 per docs) + the Langfuse mark,
        // matching LangfuseLogo's customized layout.
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoLight}
            alt="Logo"
            className="max-h-5 max-w-16 dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDark}
            alt="Logo"
            className="hidden max-h-5 max-w-16 dark:block"
          />
          <PlusIcon size={8} className="text-muted-foreground" />
          <LangfuseIcon size={16} />
        </>
      ) : variant === "wordmark" ? (
        <span className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <LangfuseIcon size={16} />
          {PRODUCT_NAME}
        </span>
      ) : (
        <LangfuseIcon size={28} />
      )}
    </Link>
  );
};
