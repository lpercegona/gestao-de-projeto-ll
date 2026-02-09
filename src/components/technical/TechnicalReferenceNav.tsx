import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/database-queries", label: "Strings" },
  { to: "/style-classes", label: "Estilos" },
  { to: "/page-constants", label: "Constantes" },
];

export const TechnicalReferenceNav = () => {
  const location = useLocation();

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            location.pathname === link.to
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted",
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
};
