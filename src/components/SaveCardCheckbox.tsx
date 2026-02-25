import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface SaveCardCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SaveCardCheckbox({ 
  checked, 
  onCheckedChange, 
  disabled = false 
}: SaveCardCheckboxProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
      <Checkbox
        id="save-card"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1">
        <Label 
          htmlFor="save-card" 
          className="text-sm font-medium cursor-pointer"
        >
          Salvar cartão para compras futuras
        </Label>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Seus dados são criptografados e armazenados com segurança pelo Mercado Pago
        </p>
      </div>
    </div>
  );
}
