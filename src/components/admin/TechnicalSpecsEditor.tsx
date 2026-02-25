import React, { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TechnicalSpec {
  key: string;
  value: string;
}

interface TechnicalSpecsEditorProps {
  specs: TechnicalSpec[];
  onChange: (specs: TechnicalSpec[]) => void;
}

export function TechnicalSpecsEditor({ specs, onChange }: TechnicalSpecsEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    onChange([...specs, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey("");
    setNewValue("");
  };

  const handleRemove = (index: number) => {
    onChange(specs.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: "key" | "value", val: string) => {
    const updated = [...specs];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Specs */}
      {specs.length > 0 && (
        <div className="space-y-2">
          {specs.map((spec, index) => (
            <div key={index} className="flex items-center gap-2 group">
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
              <Input
                value={spec.key}
                onChange={(e) => handleUpdate(index, "key", e.target.value)}
                placeholder="Nome"
                className="flex-1"
              />
              <Input
                value={spec.value}
                onChange={(e) => handleUpdate(index, "value", e.target.value)}
                placeholder="Valor"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Spec */}
      <div className="flex items-end gap-2 pt-2 border-t border-dashed">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Nome da especificação</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Voltagem, Material, Potência"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Valor</Label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: 220V, Aço Inox, 1.5CV"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!newKey.trim() || !newValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {specs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhuma especificação técnica cadastrada. Adicione acima.
        </p>
      )}
    </div>
  );
}
