import { Link } from "react-router-dom";
import type { Product, Variant } from "@/types/database";

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

interface SearchResultsProps {
  products: ProductWithVariants[];
  query: string;
  onClose: () => void;
}

export function SearchResults({ products, query, onClose }: SearchResultsProps) {
  if (!query.trim()) {
    return null;
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  if (products.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg p-4 z-50">
        <p className="text-sm text-muted-foreground text-center">
          Nenhum produto encontrado para "{query}"
        </p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
      <div className="p-2 border-b bg-muted">
        <p className="text-xs text-muted-foreground">
          {products.length} produto(s) encontrado(s) para "{query}"
        </p>
      </div>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <Link
              to={`/produto/${product.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">
                  {product.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {product.category}
                </p>
              </div>
              <span className="font-semibold text-foreground text-sm">
                {formatPrice(product.base_price)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
