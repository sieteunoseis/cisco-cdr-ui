import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Search", path: "/" },
  { label: "SQL", path: "/sql" },
  { label: "DN Map", path: "/seat-map" },
  { label: "Settings", path: "/settings" },
];

export function Header() {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CDR Dashboard
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/" ||
                    location.pathname.startsWith("/call/")
                  : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm"
                  >
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {theme === "dark" ? "☀" : "☾"}
        </Button>
      </div>
    </header>
  );
}
