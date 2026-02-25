export interface ShippingOption {
  id: number;
  name: string;
  company: {
    id: number;
    name: string;
    picture: string;
  };
  price: number;
  delivery_min: number;
  delivery_max: number;
  delivery_time: string;
}

export interface ShippingCalculationResponse {
  success: boolean;
  origin_cep: string;
  destination_cep: string;
  options: ShippingOption[];
  error?: string;
}
