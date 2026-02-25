import { Link } from "react-router-dom";
import { Fuel, CircleDot, Filter, Gauge, Settings, Package } from "lucide-react";

const categories = [
  { icon: Fuel, label: "Bicos", href: "/categoria/bicos", count: 15 },
  { icon: CircleDot, label: "Mangueiras", href: "/categoria/mangueiras", count: 22 },
  { icon: Filter, label: "Filtros", href: "/categoria/filtros", count: 18 },
  { icon: Gauge, label: "Válvulas", href: "/categoria/valvulas", count: 12 },
  { icon: Settings, label: "Aferidores", href: "/categoria/aferidores", count: 8 },
  { icon: Package, label: "Kits", href: "/categoria/kits", count: 10 },
];

export function QuickCategories() {
  return (
    <section className="bg-white border-y border-gray-200 py-4">
      <div className="container-custom">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.href}
              to={cat.href}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                <cat.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-gray-900">{cat.label}</span>
              <span className="text-[10px] text-gray-500">{cat.count} itens</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
