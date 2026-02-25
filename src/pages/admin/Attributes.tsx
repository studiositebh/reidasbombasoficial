import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronRight, Save, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Attribute, AttributeValue } from "@/types/database";

interface AttributeWithValues extends Attribute {
  values: AttributeValue[];
}

export default function Attributes() {
  const [attributes, setAttributes] = useState<AttributeWithValues[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeWithValues | null>(null);
  
  // Attribute dialog
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [attrName, setAttrName] = useState("");
  const [attrSlug, setAttrSlug] = useState("");
  
  // Value dialog
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<AttributeValue | null>(null);
  const [valueName, setValueName] = useState("");
  const [valueMeta, setValueMeta] = useState("");
  
  // Delete confirmation
  const [deleteAttrId, setDeleteAttrId] = useState<string | null>(null);
  const [deleteValueId, setDeleteValueId] = useState<string | null>(null);

  const fetchAttributes = async () => {
    try {
      const { data: attrs, error: attrsError } = await supabase
        .from("attributes")
        .select("*")
        .order("name");

      if (attrsError) throw attrsError;

      const { data: values, error: valuesError } = await supabase
        .from("attribute_values")
        .select("*")
        .order("sort_order");

      if (valuesError) throw valuesError;

      const attributesWithValues: AttributeWithValues[] = (attrs || []).map(attr => ({
        ...attr,
        values: (values || []).filter(v => v.attribute_id === attr.id)
      }));

      setAttributes(attributesWithValues);
      
      // Update selected attribute if it exists
      if (selectedAttribute) {
        const updated = attributesWithValues.find(a => a.id === selectedAttribute.id);
        setSelectedAttribute(updated || null);
      }
    } catch (error) {
      console.error("Error fetching attributes:", error);
      toast.error("Erro ao carregar atributos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingAttr && attrName) {
      const slug = attrName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setAttrSlug(slug);
    }
  }, [attrName, editingAttr]);

  const openAttrDialog = (attr?: Attribute) => {
    if (attr) {
      setEditingAttr(attr);
      setAttrName(attr.name);
      setAttrSlug(attr.slug);
    } else {
      setEditingAttr(null);
      setAttrName("");
      setAttrSlug("");
    }
    setAttrDialogOpen(true);
  };

  const saveAttribute = async () => {
    if (!attrName.trim() || !attrSlug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    try {
      if (editingAttr) {
        const { error } = await supabase
          .from("attributes")
          .update({ name: attrName, slug: attrSlug })
          .eq("id", editingAttr.id);

        if (error) throw error;
        toast.success("Atributo atualizado!");
      } else {
        const { error } = await supabase
          .from("attributes")
          .insert({ name: attrName, slug: attrSlug });

        if (error) throw error;
        toast.success("Atributo criado!");
      }

      setAttrDialogOpen(false);
      fetchAttributes();
    } catch (error: any) {
      console.error("Error saving attribute:", error);
      if (error.code === "23505") {
        toast.error("Já existe um atributo com esse slug");
      } else {
        toast.error("Erro ao salvar atributo");
      }
    }
  };

  const deleteAttribute = async () => {
    if (!deleteAttrId) return;

    try {
      const { error } = await supabase
        .from("attributes")
        .delete()
        .eq("id", deleteAttrId);

      if (error) throw error;

      toast.success("Atributo excluído");
      if (selectedAttribute?.id === deleteAttrId) {
        setSelectedAttribute(null);
      }
      fetchAttributes();
    } catch (error) {
      console.error("Error deleting attribute:", error);
      toast.error("Erro ao excluir atributo");
    } finally {
      setDeleteAttrId(null);
    }
  };

  const openValueDialog = (value?: AttributeValue) => {
    if (value) {
      setEditingValue(value);
      setValueName(value.value);
      setValueMeta(value.meta_value || "");
    } else {
      setEditingValue(null);
      setValueName("");
      setValueMeta("");
    }
    setValueDialogOpen(true);
  };

  const saveValue = async () => {
    if (!valueName.trim() || !selectedAttribute) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingValue) {
        const { error } = await supabase
          .from("attribute_values")
          .update({ value: valueName, meta_value: valueMeta || null })
          .eq("id", editingValue.id);

        if (error) throw error;
        toast.success("Valor atualizado!");
      } else {
        const { error } = await supabase
          .from("attribute_values")
          .insert({
            attribute_id: selectedAttribute.id,
            value: valueName,
            meta_value: valueMeta || null,
            sort_order: selectedAttribute.values.length,
          });

        if (error) throw error;
        toast.success("Valor adicionado!");
      }

      setValueDialogOpen(false);
      fetchAttributes();
    } catch (error: any) {
      console.error("Error saving value:", error);
      if (error.code === "23505") {
        toast.error("Já existe esse valor para este atributo");
      } else {
        toast.error("Erro ao salvar valor");
      }
    }
  };

  const deleteValue = async () => {
    if (!deleteValueId) return;

    try {
      const { error } = await supabase
        .from("attribute_values")
        .delete()
        .eq("id", deleteValueId);

      if (error) throw error;

      toast.success("Valor excluído");
      fetchAttributes();
    } catch (error) {
      console.error("Error deleting value:", error);
      toast.error("Erro ao excluir valor");
    } finally {
      setDeleteValueId(null);
    }
  };

  return (
    <AdminLayout title="Atributos">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attributes List */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Atributos</CardTitle>
            <Button size="sm" onClick={() => openAttrDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : attributes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum atributo cadastrado</p>
                <p className="text-sm mt-1">Crie atributos como Cor, Voltagem, Tamanho...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAttribute?.id === attr.id
                        ? "bg-primary/10 border border-primary"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedAttribute(attr)}
                  >
                    <div>
                      <p className="font-medium">{attr.name}</p>
                      <p className="text-sm text-gray-500">
                        {attr.values.length} {attr.values.length === 1 ? "valor" : "valores"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAttrDialog(attr);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAttrId(attr.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Values List */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {selectedAttribute ? `Valores: ${selectedAttribute.name}` : "Selecione um Atributo"}
            </CardTitle>
            {selectedAttribute && (
              <Button size="sm" onClick={() => openValueDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Valor
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedAttribute ? (
              <div className="text-center py-8 text-gray-500">
                <p>Clique em um atributo à esquerda para gerenciar seus valores</p>
              </div>
            ) : selectedAttribute.values.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum valor cadastrado</p>
                <p className="text-sm mt-1">
                  Adicione valores como "Vermelho", "110V", "Grande"...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedAttribute.values.map((value) => (
                  <div
                    key={value.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {value.meta_value && (
                        <span
                          className="w-6 h-6 rounded-full border shadow-sm"
                          style={{ backgroundColor: value.meta_value }}
                        />
                      )}
                      <div>
                        <p className="font-medium">{value.value}</p>
                        {value.meta_value && (
                          <p className="text-xs text-gray-500">{value.meta_value}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openValueDialog(value)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => setDeleteValueId(value.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attribute Dialog */}
      <Dialog open={attrDialogOpen} onOpenChange={setAttrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAttr ? "Editar Atributo" : "Novo Atributo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attrName">Nome</Label>
              <Input
                id="attrName"
                value={attrName}
                onChange={(e) => setAttrName(e.target.value)}
                placeholder="Ex: Cor, Voltagem, Tamanho"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attrSlug">Slug (identificador)</Label>
              <Input
                id="attrSlug"
                value={attrSlug}
                onChange={(e) => setAttrSlug(e.target.value)}
                placeholder="cor, voltagem, tamanho"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttrDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAttribute}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Value Dialog */}
      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingValue ? "Editar Valor" : "Novo Valor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="valueName">Valor</Label>
              <Input
                id="valueName"
                value={valueName}
                onChange={(e) => setValueName(e.target.value)}
                placeholder="Ex: Vermelho, 110V, Grande"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueMeta">Meta (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="valueMeta"
                  value={valueMeta}
                  onChange={(e) => setValueMeta(e.target.value)}
                  placeholder="Ex: #FF0000 (para cores)"
                />
                {valueMeta && valueMeta.startsWith("#") && (
                  <div
                    className="w-10 h-10 rounded border flex-shrink-0"
                    style={{ backgroundColor: valueMeta }}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500">
                Para cores, use códigos HEX (ex: #FF0000 para vermelho)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveValue}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Attribute Confirmation */}
      <AlertDialog open={!!deleteAttrId} onOpenChange={() => setDeleteAttrId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atributo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este atributo? Todos os valores associados também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAttribute} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Value Confirmation */}
      <AlertDialog open={!!deleteValueId} onOpenChange={() => setDeleteValueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Valor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este valor?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteValue} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
