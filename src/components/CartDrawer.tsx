import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/contexts/CartContext";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalItems, subtotal, clearCart } = useCart();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col bg-white">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Carrinho ({totalItems})
            </SheetTitle>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Seu carrinho está vazio
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Adicione produtos para continuar comprando
            </p>
            <Button 
              className="btn-primary"
              onClick={() => onOpenChange(false)}
              asChild
            >
              <Link to="/">Ver Produtos</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Backorder Warning */}
            {items.some(item => item.variant.stock_level <= 0) && (
              <Alert className="bg-amber-50 border-amber-200 mb-4">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Alguns itens estão <strong>sob encomenda</strong> e podem demorar mais para ser enviados.
                </AlertDescription>
              </Alert>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => {
                const itemPrice = item.product.base_price + (item.variant.price_modifier || 0);
                const attrsStr = Object.entries(item.variant.attrs)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" | ");
                const isBackorder = item.variant.stock_level <= 0;

                return (
                  <div 
                    key={item.variant.id} 
                    className={`flex gap-4 p-3 rounded-lg border ${isBackorder ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"}`}
                  >
                    {/* Image */}
                    <div className="w-20 h-20 bg-white rounded-md overflow-hidden border border-gray-200 shrink-0 relative">
                      <img
                        src={item.product.image_url || "/placeholder.svg"}
                        alt={item.product.title}
                        className="w-full h-full object-contain"
                      />
                      {isBackorder && (
                        <div className="absolute bottom-0 left-0 right-0 bg-amber-600 text-white text-[10px] text-center py-0.5 font-medium">
                          Encomenda
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {item.product.title}
                      </h4>
                      {attrsStr && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {attrsStr}
                        </p>
                      )}
                      {isBackorder && (
                        <p className="text-xs text-amber-700 mt-1 font-medium">
                          Envio em 7 dias úteis
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary mt-2">
                        {formatPrice(itemPrice)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded bg-white">
                          <button
                            onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="h-3 w-3 text-gray-600" />
                          </button>
                          <span className="px-3 text-sm font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.variant.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t pt-4 mt-auto flex flex-col gap-4">
              {/* Subtotal */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Frete</span>
                  <span>Calculado no checkout</span>
                </div>
              </div>

              {/* Total */}
              <div className="w-full flex items-center justify-between pt-2 border-t">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-xl font-black text-primary">{formatPrice(subtotal)}</span>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2">
                <Button 
                  className="w-full btn-primary h-12 text-base font-bold"
                  asChild
                  onClick={() => onOpenChange(false)}
                >
                  <Link to="/checkout">Finalizar Pedido</Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-10"
                  onClick={() => onOpenChange(false)}
                >
                  Continuar Comprando
                </Button>
                <button
                  onClick={clearCart}
                  className="w-full text-sm text-gray-500 hover:text-red-500 transition-colors py-2"
                >
                  Limpar carrinho
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
