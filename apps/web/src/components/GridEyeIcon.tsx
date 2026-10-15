import type { SVGProps } from "react";

type GridEyeIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
  /** Strikes the eye through, for a workplane that is switched off. */
  crossed?: boolean;
};

/**
 * An eye over a gridded plate, drawn on Lucide's 24 grid with its stroke
 * conventions, so it sits beside the lucide-react icons in the camera toolbar.
 * The grid lines are thinner than the outline so the plate still reads as one
 * shape at 24 pixels.
 */
export function GridEyeIcon({ size = 24, strokeWidth = 2, crossed = false, ...props }: GridEyeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 14 22 18 12 22 2 18Z" />
      <path d="M7 16 17 20M17 16 7 20" strokeWidth={1.5} />
      <path d="M4 7.5a10 10 0 0 1 16 0a10 10 0 0 1-16 0" />
      <circle cx="12" cy="7.5" r="2" />
      {crossed ? <path d="M4 2.5 20 12.5" /> : null}
    </svg>
  );
}
