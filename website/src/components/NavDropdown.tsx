import Link from "next/link";
import type { NavLinkItem } from "@/utils/nav";

interface NavDropdownProps {
  label: string;
  href: string;
  links: NavLinkItem[];
}

export function NavDropdown({ label, href, links }: NavDropdownProps) {
  return (
    <div className="dropdown dropdown-end dropdown-hover">
      <Link href={href} className="btn btn-ghost btn-sm">
        {label}
      </Link>
      <div tabIndex={0} className="dropdown-content z-10 w-52 pt-2">
        <ul className="menu rounded-box max-h-80 w-full overflow-y-auto bg-base-200 p-2 shadow-lg backdrop-blur">
          {links.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
