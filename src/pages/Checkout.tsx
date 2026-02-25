import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowLeft, CreditCard, Loader2, 
  MapPin, User, Mail, Phone, Building, Truck, CheckCircle2, Shield, Package, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ShippingOption } from "@/types/shipping";
import { CustomCardPayment, CustomCardPaymentData } from "@/components/CustomCardPayment";
import { MercadoPagoPixPayment } from "@/components/MercadoPagoPixPayment";
import { MercadoPagoBoletoPayment } from "@/components/MercadoPagoBoletoPayment";
import { PaymentMethodSelector, PaymentMethod } from "@/components/PaymentMethodSelector";
import { SavedCardsList } from "@/components/SavedCardsList";
import { SaveCardCheckbox } from "@/components/SaveCardCheckbox";
import { InstallmentSelector } from "@/components/InstallmentSelector";
import { CouponInput, AppliedCoupon } from "@/components/CouponInput";
import { useInstallmentSettings } from "@/hooks/useInstallmentSettings";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { SavedAddressSelector, SavedAddress } from "@/components/SavedAddressSelector";
import mercadoPagoLogo from "@/assets/mercado-pago-logo.svg";
import { CardBrandIcons } from "@/components/CardBrandIcons";

// Validation schema
const addressSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("E-mail inválido").max(255),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpfCnpj: z.string().min(11, "CPF/CNPJ inválido").max(18),
  cep: z.string().length(8, "CEP deve ter 8 dígitos"),
  street: z.string().min(3, "Endereço é obrigatório").max(200),
  number: z.string().min(1, "Número é obrigatório").max(10),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório").max(100),
  city: z.string().min(2, "Cidade é obrigatória").max(100),
  state: z.string().length(2, "UF deve ter 2 letras"),
});

type AddressFormData = z.infer<typeof addressSchema>;

const creditCardPaymentSchema = z.object({
  token: z.string().min(1),
  issuer_id: z.string().optional(),
  payment_method_id: z.string().min(1),
  installments: z.number().int().min(1).max(24),
  transaction_amount: z.number().finite().positive(),
  payer_email: z.string().email(),
  payer_identification_type: z.string().min(2).max(10),
  payer_identification_number: z.string().min(11).max(14),
});

export default function Checkout() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { settings: installmentSettings } = useInstallmentSettings();
  const { lookupCustomer, isLooking: isLookingUpCustomer } = useCustomerLookup();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(null);
  const [savedCardInstallments, setSavedCardInstallments] = useState(1);
  const [savedCardTotalWithInterest, setSavedCardTotalWithInterest] = useState(0);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [customerPrefilled, setCustomerPrefilled] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  const [formData, setFormData] = useState<AddressFormData>({
    name: "",
    email: "",
    phone: "",
    cpfCnpj: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const formatVariantAttrs = (attrs: unknown) => {
    if (typeof attrs !== "object" || attrs === null || Array.isArray(attrs)) {
      return "";
    }
    return Object.entries(attrs as Record<string, string | number>)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ");
  };

  const handleInputChange = (field: keyof AddressFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Debounced email lookup for returning customers
  const handleEmailBlur = useCallback(async () => {
    const email = formData.email.trim();
    if (!email || customerPrefilled) return;

    const customerData = await lookupCustomer(email);
    
    if (customerData) {
      // Prefill form with customer data
      setFormData((prev) => ({
        ...prev,
        name: customerData.name || prev.name,
        phone: customerData.phone ? formatPhone(customerData.phone) : prev.phone,
        cpfCnpj: customerData.cpfCnpj ? formatCpfCnpj(customerData.cpfCnpj) : prev.cpfCnpj,
        cep: customerData.address?.cep || prev.cep,
        street: customerData.address?.street || prev.street,
        number: customerData.address?.number || prev.number,
        complement: customerData.address?.complement || prev.complement,
        neighborhood: customerData.address?.neighborhood || prev.neighborhood,
        city: customerData.address?.city || prev.city,
        state: customerData.address?.state || prev.state,
      }));
      
      setCustomerPrefilled(true);
      toast.success("Bem-vindo de volta!", {
        description: "Preenchemos seus dados automaticamente.",
      });

      // Calculate shipping if we have a CEP
      if (customerData.address?.cep && customerData.address.cep.length === 8) {
        calculateShipping(customerData.address.cep);
      }
    }
  }, [formData.email, customerPrefilled, lookupCustomer]);

  // Handle saved address selection
  const handleSavedAddressSelect = useCallback((address: SavedAddress) => {
    setSelectedSavedAddressId(address.id);
    setShowAddressForm(false);
    
    setFormData((prev) => ({
      ...prev,
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement || "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
    }));

    // Calculate shipping for selected address
    if (address.cep.length === 8) {
      calculateShipping(address.cep);
    }
  }, []);

  const handleNewAddress = useCallback(() => {
    setSelectedSavedAddressId("new");
    setShowAddressForm(true);
    // Clear address fields for new entry
    setFormData((prev) => ({
      ...prev,
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    }));
    setShippingOptions([]);
    setSelectedShipping(null);
  }, []);

  const formatCep = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 8);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return numbers
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  };

  const fetchAddressByCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      
      setFormData((prev) => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));

      // Calculate shipping after getting address
      await calculateShipping(cep);
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const calculateShipping = async (cep: string) => {
    if (cep.length !== 8 || items.length === 0) return;

    setIsLoadingShipping(true);
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const { data, error } = await supabase.functions.invoke("calculate-shipping", {
        body: {
          destination_cep: cep.replace(/\D/g, ""),
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.options && data.options.length > 0) {
        setShippingOptions(data.options);
        // Auto-select cheapest option
        setSelectedShipping(data.options[0]);
      } else {
        toast.error("Nenhuma opção de frete disponível para este CEP");
      }
    } catch (error) {
      console.error("Shipping calculation error:", error);
      toast.error("Erro ao calcular frete", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const validateStep1 = () => {
    const step1Fields = ["name", "email", "phone", "cpfCnpj"] as const;
    const partialSchema = z.object({
      name: addressSchema.shape.name,
      email: addressSchema.shape.email,
      phone: addressSchema.shape.phone,
      cpfCnpj: addressSchema.shape.cpfCnpj,
    });
    
    const result = partialSchema.safeParse({
      name: formData.name,
      email: formData.email,
      phone: formData.phone.replace(/\D/g, ""),
      cpfCnpj: formData.cpfCnpj.replace(/\D/g, ""),
    });
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AddressFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof AddressFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    const result = addressSchema.safeParse({
      ...formData,
      phone: formData.phone.replace(/\D/g, ""),
      cpfCnpj: formData.cpfCnpj.replace(/\D/g, ""),
      cep: formData.cep.replace(/\D/g, ""),
    });
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AddressFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof AddressFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  // Silent save lead data for abandoned cart recovery
  const saveLeadData = async () => {
    try {
      const cartData = items.map((item) => ({
        product_id: item.product.id,
        product_title: item.product.title,
        variant_id: item.variant.id,
        variant_sku: item.variant.sku,
        quantity: item.quantity,
        unit_price: item.variant.price ?? item.product.base_price,
      }));

      // Call secure edge function (uses service role, bypasses RLS)
      const { error } = await supabase.functions.invoke("save-lead", {
        body: {
          email: formData.email.trim().toLowerCase(),
          name: formData.name.trim(),
          phone: formData.phone.replace(/\D/g, "") || null,
          document: formData.cpfCnpj.replace(/\D/g, "") || null,
          cart_items: cartData,
          cart_total: subtotal,
          source: "checkout",
        },
      });

      if (error) {
        // Log for debugging but don't block user
        console.warn("[Leads] save-lead failed:", error.message);
      }
    } catch (err) {
      // Silent fail - don't interrupt the user flow
      console.warn("[Leads] Unexpected error:", err);
    }
  };

  // Mark lead as converted when order is placed
  const convertLead = async (orderId: string) => {
    try {
      await supabase
        .from("leads")
        .update({
          status: "converted",
          converted_at: new Date().toISOString(),
          order_id: orderId,
        })
        .eq("email", formData.email.trim().toLowerCase());
    } catch (error) {
      // Silent fail
      console.error("[Lead] Failed to convert lead:", error);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1 && validateStep1()) {
      // Save lead data silently (fire and forget)
      saveLeadData();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      if (!selectedShipping) {
        toast.error("Selecione uma opção de frete");
        return;
      }
      setCurrentStep(3);
    }
  };

  const shippingCost = selectedShipping?.price || 0;
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const total = Math.max(0, subtotal + shippingCost - couponDiscount);

  const buildShippingAddress = () => ({
    name: formData.name,
    phone: formData.phone,
    cpf_cnpj: formData.cpfCnpj.replace(/\D/g, ""),
    cep: formData.cep,
    street: formData.street,
    number: formData.number,
    complement: formData.complement,
    neighborhood: formData.neighborhood,
    city: formData.city,
    state: formData.state,
  });

  const buildCartItems = () => items.map((item) => ({
    product: {
      id: item.product.id,
      title: item.product.title,
      base_price: item.product.base_price,
      image_url: item.product.image_url,
    },
    variant: {
      id: item.variant.id,
      sku: item.variant.sku,
      price_modifier: item.variant.price_modifier || 0,
      attrs: item.variant.attrs,
    },
    quantity: item.quantity,
  }));

  const buildShippingOption = () => selectedShipping ? {
    id: selectedShipping.id,
    name: selectedShipping.name,
    company: selectedShipping.company.name,
    price: selectedShipping.price,
    delivery_time: selectedShipping.delivery_time,
  } : null;

  const buildCouponData = () => appliedCoupon ? {
    id: appliedCoupon.id,
    code: appliedCoupon.code,
    discount_amount: appliedCoupon.discount_amount,
  } : null;

  const handleCustomCardPayment = async (paymentFormData: CustomCardPaymentData) => {
    setIsProcessing(true);

    try {
      const payment_data = {
        token: paymentFormData.token,
        issuer_id: paymentFormData.issuer_id,
        payment_method_id: paymentFormData.payment_method_id,
        installments: paymentFormData.installments,
        transaction_amount: paymentFormData.totalWithInterest,
        payer_email: formData.email.trim(),
        payer_identification_type: paymentFormData.payer?.identification?.type || "CPF",
        payer_identification_number: formData.cpfCnpj.replace(/\D/g, ""),
      };

      const parsed = creditCardPaymentSchema.safeParse(payment_data);
      if (!parsed.success) {
        console.warn("[Checkout] Invalid payment payload:", parsed.error.flatten());
        toast.error("Dados de pagamento inválidos", {
          description: "Revise e-mail, CPF e parcelas e tente novamente.",
        });
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          items: buildCartItems(),
          payment_type: "credit_card",
          payment_data: parsed.data,
          shipping_address: buildShippingAddress(),
          shipping_option: buildShippingOption(),
          coupon: buildCouponData(),
          save_card: saveCardForFuture && !!user,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        // Surface full MP error for debugging in production
        const mpError = data?.mp_error;
        let debugDetails = "";
        
        if (mpError) {
          const parts: string[] = [];
          if (mpError.message) parts.push(mpError.message);
          if (mpError.error) parts.push(mpError.error);
          if (mpError.status_detail) parts.push(mpError.status_detail);
          if (mpError.cause && Array.isArray(mpError.cause)) {
            mpError.cause.forEach((c: { code?: number; description?: string }) => {
              if (c.code || c.description) {
                parts.push(`[${c.code}] ${c.description || ""}`);
              }
            });
          }
          debugDetails = parts.join(" | ");
        }

        console.error("[Payment] MP error details:", mpError);
        throw new Error(debugDetails || data.error);
      }

      // Save card if requested and payment was successful
      if (saveCardForFuture && user && data?.status === "approved") {
        try {
          await supabase.functions.invoke("manage-saved-cards", {
            body: {
              action: "save",
              card_data: {
                token: paymentFormData.token,
                payment_method_id: paymentFormData.payment_method_id,
                issuer_id: paymentFormData.issuer_id,
                payer_email: formData.email,
              },
            },
          });
          toast.success("Cartão salvo para compras futuras!");
        } catch (saveError) {
          console.error("Error saving card:", saveError);
          // Don't block the order, just log the error
        }
      }

      // Handle payment result
      if (data?.status === "approved") {
        convertLead(data.order_id); // Mark lead as converted
        clearCart();
        navigate(`/pedido-confirmado?order_id=${data.order_id}`);
      } else if (data?.status === "pending" || data?.status === "in_process") {
        convertLead(data.order_id); // Mark lead as converted (payment initiated)
        clearCart();
        navigate(`/pedido-pendente?order_id=${data.order_id}`);
      } else {
        toast.error("Pagamento não aprovado", {
          description: data?.status_detail || "Tente novamente com outro cartão ou forma de pagamento.",
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erro ao processar pagamento", {
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePixPayment = async () => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          items: buildCartItems(),
          payment_type: "pix",
          payment_data: {
            payer_email: formData.email,
            payer_name: formData.name,
            payer_identification_type: "CPF",
            payer_identification_number: formData.cpfCnpj.replace(/\D/g, ""),
          },
          shipping_address: buildShippingAddress(),
          shipping_option: buildShippingOption(),
          coupon: buildCouponData(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // PIX returns pending status with QR code data
      if (data?.pix_data) {
        convertLead(data.order_id); // Mark lead as converted
        return {
          success: true,
          order_id: data.order_id,
          pix_data: data.pix_data,
        };
      }

      return { success: false, error: "Erro ao gerar código PIX" };
    } catch (error) {
      console.error("PIX Payment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao processar pagamento PIX",
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBoletoPayment = async () => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          items: buildCartItems(),
          payment_type: "boleto",
          payment_data: {
            payer_email: formData.email,
            payer_name: formData.name,
            payer_identification_type: "CPF",
            payer_identification_number: formData.cpfCnpj.replace(/\D/g, ""),
            payer_address: {
              zip_code: formData.cep.replace(/\D/g, ""),
              street_name: formData.street,
              street_number: formData.number,
              neighborhood: formData.neighborhood,
              city: formData.city,
              federal_unit: formData.state,
            },
          },
          shipping_address: buildShippingAddress(),
          shipping_option: buildShippingOption(),
          coupon: buildCouponData(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Boleto returns pending status with barcode data
      if (data?.boleto_data) {
        convertLead(data.order_id); // Mark lead as converted
        return {
          success: true,
          order_id: data.order_id,
          boleto_data: data.boleto_data,
        };
      }

      return { success: false, error: "Erro ao gerar boleto" };
    } catch (error) {
      console.error("Boleto Payment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao processar pagamento via Boleto",
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSavedCardPayment = async () => {
    if (!selectedSavedCardId || !user) return;
    
    setIsProcessing(true);

    try {
      // Calculate the amount with interest if applicable
      const amountToCharge = savedCardTotalWithInterest > 0 ? savedCardTotalWithInterest : total;
      
      // First, create the order
      const { data: orderData, error: orderError } = await supabase.functions.invoke("process-payment", {
        body: {
          items: buildCartItems(),
          payment_type: "saved_card",
          payment_data: {
            saved_card_id: selectedSavedCardId,
            installments: savedCardInstallments,
            total_with_interest: amountToCharge,
            payer_email: formData.email,
            payer_identification_type: "CPF",
            payer_identification_number: formData.cpfCnpj.replace(/\D/g, ""),
          },
          shipping_address: buildShippingAddress(),
          shipping_option: buildShippingOption(),
          coupon: buildCouponData(),
        },
      });

      if (orderError) {
        throw new Error(orderError.message);
      }

      if (orderData?.error) {
        throw new Error(orderData.error);
      }

      // Handle payment result
      if (orderData?.status === "approved") {
        convertLead(orderData.order_id); // Mark lead as converted
        clearCart();
        navigate(`/pedido-confirmado?order_id=${orderData.order_id}`);
      } else if (orderData?.status === "pending" || orderData?.status === "in_process") {
        convertLead(orderData.order_id); // Mark lead as converted
        clearCart();
        navigate(`/pedido-pendente?order_id=${orderData.order_id}`);
      } else {
        toast.error("Pagamento não aprovado", {
          description: orderData?.status_detail || "Tente novamente com outro cartão ou forma de pagamento.",
        });
      }
    } catch (error) {
      console.error("Saved card payment error:", error);
      toast.error("Erro ao processar pagamento", {
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container-custom py-16 text-center">
          <div className="max-w-md mx-auto">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Seu carrinho está vazio
            </h1>
            <p className="text-gray-500 mb-6">
              Adicione produtos ao carrinho para continuar com a compra.
            </p>
            <Button asChild className="btn-primary">
              <Link to="/">Ver Produtos</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-custom py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continuar Comprando
          </Link>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar Compra</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm ${
              currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
            }`}>
              {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <span className={`text-sm font-medium ${currentStep >= 1 ? "text-gray-900" : "text-gray-400"}`}>
              Dados Pessoais
            </span>
          </div>
          <div className={`w-16 h-1 mx-2 ${currentStep >= 2 ? "bg-primary" : "bg-gray-200"}`} />
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm ${
              currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
            }`}>
              {currentStep > 2 ? <CheckCircle2 className="h-5 w-5" /> : "2"}
            </div>
            <span className={`text-sm font-medium ${currentStep >= 2 ? "text-gray-900" : "text-gray-400"}`}>
              Endereço
            </span>
          </div>
          <div className={`w-16 h-1 mx-2 ${currentStep >= 3 ? "bg-primary" : "bg-gray-200"}`} />
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm ${
              currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
            }`}>
              3
            </div>
            <span className={`text-sm font-medium ${currentStep >= 3 ? "text-gray-900" : "text-gray-400"}`}>
              Pagamento
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Personal Data */}
            {currentStep === 1 && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <User className="h-5 w-5 text-primary" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        placeholder="João da Silva"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpfCnpj">CPF / CNPJ *</Label>
                      <Input
                        id="cpfCnpj"
                        placeholder="000.000.000-00"
                        value={formData.cpfCnpj}
                        onChange={(e) => handleInputChange("cpfCnpj", formatCpfCnpj(e.target.value))}
                        className={errors.cpfCnpj ? "border-red-500" : ""}
                      />
                      {errors.cpfCnpj && <p className="text-xs text-red-500">{errors.cpfCnpj}</p>}
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          onBlur={handleEmailBlur}
                          className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                        />
                        {isLookingUpCustomer && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                      {!errors.email && !isLookingUpCustomer && (
                        <p className="text-xs text-muted-foreground">Já comprou conosco? Seus dados serão preenchidos automaticamente.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", formatPhone(e.target.value))}
                          className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                    </div>
                  </div>

                  <Button className="w-full btn-primary h-12" onClick={handleNextStep}>
                    Continuar para Endereço
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Address */}
            {currentStep === 2 && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <MapPin className="h-5 w-5 text-primary" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Saved Addresses Selector */}
                  {user && (
                    <SavedAddressSelector
                      onSelect={handleSavedAddressSelect}
                      onNewAddress={handleNewAddress}
                      selectedId={selectedSavedAddressId}
                    />
                  )}

                  {/* Address Form - show if no user, or user clicked "new address", or no saved addresses selected */}
                  {(!user || showAddressForm || selectedSavedAddressId === "new") && (
                    <>
                      {user && <Separator />}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP *</Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={(e) => {
                            const cep = formatCep(e.target.value);
                            handleInputChange("cep", cep);
                            if (cep.length === 8) fetchAddressByCep(cep);
                          }}
                          className={errors.cep ? "border-red-500" : ""}
                          disabled={isLoadingCep}
                        />
                        {isLoadingCep && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                        )}
                      </div>
                      {errors.cep && <p className="text-xs text-red-500">{errors.cep}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="street">Endereço *</Label>
                      <Input
                        id="street"
                        placeholder="Rua, Avenida..."
                        value={formData.street}
                        onChange={(e) => handleInputChange("street", e.target.value)}
                        className={errors.street ? "border-red-500" : ""}
                      />
                      {errors.street && <p className="text-xs text-red-500">{errors.street}</p>}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        placeholder="123"
                        value={formData.number}
                        onChange={(e) => handleInputChange("number", e.target.value)}
                        className={errors.number ? "border-red-500" : ""}
                      />
                      {errors.number && <p className="text-xs text-red-500">{errors.number}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto, Bloco, etc."
                        value={formData.complement}
                        onChange={(e) => handleInputChange("complement", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        placeholder="Centro"
                        value={formData.neighborhood}
                        onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                        className={errors.neighborhood ? "border-red-500" : ""}
                      />
                      {errors.neighborhood && <p className="text-xs text-red-500">{errors.neighborhood}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="city"
                          placeholder="São Paulo"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          className={`pl-10 ${errors.city ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">UF *</Label>
                      <Input
                        id="state"
                        placeholder="SP"
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value.toUpperCase())}
                        className={errors.state ? "border-red-500" : ""}
                      />
                      {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
                    </div>
                    </div>
                    </>
                  )}

                  {/* Shipping Options Section */}
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold">Opções de Frete</Label>
                    </div>

                    {isLoadingShipping && (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    )}

                    {!isLoadingShipping && shippingOptions.length === 0 && formData.cep.length === 8 && (
                      <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                        <Truck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>Nenhuma opção de frete disponível para este CEP.</p>
                        <p className="text-xs mt-1">Verifique se o CEP está correto.</p>
                      </div>
                    )}

                    {!isLoadingShipping && formData.cep.length < 8 && (
                      <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                        <Truck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>Digite o CEP para calcular o frete.</p>
                      </div>
                    )}

                    {!isLoadingShipping && shippingOptions.length > 0 && (
                      <RadioGroup
                        value={selectedShipping?.id.toString()}
                        onValueChange={(value) => {
                          const option = shippingOptions.find((o) => o.id.toString() === value);
                          if (option) setSelectedShipping(option);
                        }}
                        className="space-y-3"
                      >
                        {shippingOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                              selectedShipping?.id === option.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <RadioGroupItem value={option.id.toString()} />
                            {option.company.picture && (
                              <img
                                src={option.company.picture}
                                alt={option.company.name}
                                className="w-12 h-8 object-contain"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {option.name}
                                <span className="text-xs text-gray-500 ml-2">
                                  ({option.company.name})
                                </span>
                              </p>
                              <p className="text-sm text-gray-500">{option.delivery_time}</p>
                            </div>
                            <p className="font-bold text-primary">{formatPrice(option.price)}</p>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                      Voltar
                    </Button>
                    <Button 
                      className="flex-1 btn-primary h-12" 
                      onClick={handleNextStep}
                      disabled={!selectedShipping || isLoadingShipping}
                    >
                      Continuar para Pagamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                {/* Payment Method Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Wallet className="h-5 w-5 text-primary" />
                      Forma de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodSelector
                      selected={paymentMethod}
                      onSelect={setPaymentMethod}
                      disabled={isProcessing}
                    />
                  </CardContent>
                </Card>

                {/* Payment Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      {paymentMethod === "credit_card" ? (
                        <CreditCard className="h-5 w-5 text-primary" />
                      ) : paymentMethod === "pix" ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <Package className="h-5 w-5 text-primary" />
                      )}
                      {paymentMethod === "credit_card" 
                        ? "Dados do Cartão" 
                        : paymentMethod === "pix" 
                          ? "Pagamento PIX" 
                          : "Pagamento via Boleto"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {paymentMethod === "credit_card" && (
                      <>
                        {/* Saved Cards - Only show for authenticated users */}
                        {user && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Cartões Salvos</Label>
                            <SavedCardsList
                              selectedCardId={selectedSavedCardId}
                              onSelectCard={setSelectedSavedCardId}
                              showNewCardOption={true}
                            />
                          </div>
                        )}

                        {/* New Card Form - Show when no saved card selected */}
                        {(selectedSavedCardId === null || !user) && (
                          <>
                            <CustomCardPayment
                              amount={total}
                              payerEmail={formData.email}
                              payerDocument={formData.cpfCnpj}
                              onSubmit={handleCustomCardPayment}
                              onError={(error) => {
                                console.error("Payment error:", error);
                                toast.error("Erro no formulário de pagamento", {
                                  description: "Verifique os dados do cartão e tente novamente.",
                                });
                              }}
                              isProcessing={isProcessing}
                              maxInstallments={installmentSettings.maxInstallments}
                              interestFreeInstallments={installmentSettings.interestFreeInstallments}
                              monthlyInterestRate={installmentSettings.monthlyInterestRate}
                            />
                            
                            {/* Save Card Checkbox - Only for authenticated users */}
                            {user && (
                              <SaveCardCheckbox
                                checked={saveCardForFuture}
                                onCheckedChange={setSaveCardForFuture}
                                disabled={isProcessing}
                              />
                            )}
                          </>
                        )}

                        {/* Pay with saved card section */}
                        {selectedSavedCardId && user && (
                          <div className="space-y-4 pt-2 border-t">
                            <InstallmentSelector
                              amount={total}
                              value={savedCardInstallments}
                              onChange={(installments, totalWithInterest) => {
                                setSavedCardInstallments(installments);
                                setSavedCardTotalWithInterest(totalWithInterest);
                              }}
                              maxInstallments={installmentSettings.maxInstallments}
                              interestFreeInstallments={installmentSettings.interestFreeInstallments}
                              monthlyInterestRate={installmentSettings.monthlyInterestRate}
                              disabled={isProcessing}
                            />
                            
                            <Button
                              onClick={handleSavedCardPayment}
                              disabled={isProcessing}
                              className="w-full btn-primary"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processando...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Pagar {savedCardInstallments}x de {formatPrice((savedCardTotalWithInterest || total) / savedCardInstallments)}
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                    
                    {paymentMethod === "pix" && (
                      <MercadoPagoPixPayment
                        amount={total}
                        payerEmail={formData.email}
                        payerName={formData.name}
                        payerCpf={formData.cpfCnpj}
                        onProcessPayment={handlePixPayment}
                        isProcessing={isProcessing}
                      />
                    )}
                    
                    {paymentMethod === "boleto" && (
                      <MercadoPagoBoletoPayment
                        amount={total}
                        payerEmail={formData.email}
                        payerName={formData.name}
                        payerCpf={formData.cpfCnpj}
                        payerAddress={{
                          cep: formData.cep,
                          street: formData.street,
                          number: formData.number,
                          neighborhood: formData.neighborhood,
                          city: formData.city,
                          state: formData.state,
                        }}
                        onProcessPayment={handleBoletoPayment}
                        isProcessing={isProcessing}
                      />
                    )}
                  </CardContent>
                </Card>

                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full">
                  Voltar para Endereço
                </Button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-gray-900">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items List */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => {
                    const unitPrice = item.product.base_price + (item.variant.price_modifier || 0);
                    const itemTotal = unitPrice * item.quantity;

                    return (
                      <div key={item.variant.id} className="flex gap-3">
                        <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden shrink-0">
                          <img
                            src={item.product.image_url || "/placeholder.svg"}
                            alt={item.product.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{formatVariantAttrs(item.variant.attrs)}</p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1 border rounded">
                              <button
                                onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                                className="p-1 hover:bg-gray-100"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                                className="p-1 hover:bg-gray-100"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.variant.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{formatPrice(itemTotal)}</p>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Coupon Input */}
                <CouponInput
                  orderTotal={subtotal + shippingCost}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={setAppliedCoupon}
                  onRemoveCoupon={() => setAppliedCoupon(null)}
                  disabled={isProcessing}
                />

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} itens)</span>
                    <span className="text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frete</span>
                    {selectedShipping ? (
                      <span className="text-gray-900">{formatPrice(selectedShipping.price)}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Calcular no endereço</span>
                    )}
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Cupom ({appliedCoupon.code})</span>
                      <span className="text-green-600 font-medium">-{formatPrice(appliedCoupon.discount_amount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Compra 100% segura</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <img 
                      src={mercadoPagoLogo} 
                      alt="Mercado Pago" 
                      className="h-5"
                    />
                    <span className="text-xs text-gray-500">Pagamento seguro</span>
                  </div>
                  <CardBrandIcons />
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Cartão de crédito, débito, boleto ou PIX
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
