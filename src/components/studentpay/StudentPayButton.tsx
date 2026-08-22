import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type StudentPayButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  showArrow?: boolean;
  className?: string;
};

export function StudentPayButton({
  href,
  children,
  variant = "primary",
  showArrow = false,
  className = "",
}: StudentPayButtonProps) {
  return (
    <Link
      href={href}
      className={`sp-btn sp-btn--${variant} ${className}`.trim()}
    >
      <span>{children}</span>
      {showArrow ? <ArrowRight size={18} aria-hidden="true" /> : null}
    </Link>
  );
}
