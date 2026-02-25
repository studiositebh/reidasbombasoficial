import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Star, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

const emptyAddress = {
  label: "",
  name: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export default function AccountAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteAddress, setDeleteAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState(emptyAddress);

  useEffect(() => {
    fetchAddresses();
  }, [user]);

  async function fetchAddresses() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error("Erro ao carregar endereços");
    } finally {
      setIsLoading(false);
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        name: address.name,
        phone: address.phone || "",
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement || "",
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      });
    } else {
      setEditingAddress(null);
      setFormData(emptyAddress);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!formData.label || !formData.name || !formData.cep || !formData.street || 
        !formData.number || !formData.neighborhood || !formData.city || !formData.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      const addressData = {
        user_id: user.id,
        label: formData.label,
        name: formData.name,
        phone: formData.phone || null,
        cep: formData.cep,
        street: formData.street,
        number: formData.number,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
      };

      if (editingAddress) {
        const { error } = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", editingAddress.id);

        if (error) throw error;
        toast.success("Endereço atualizado!");
      } else {
        // If this is the first address, make it default
        const isDefault = addresses.length === 0;
        const { error } = await supabase
          .from("addresses")
          .insert({ ...addressData, is_default: isDefault });

        if (error) throw error;
        toast.success("Endereço adicionado!");
      }

      setIsDialogOpen(false);
      fetchAddresses();
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Erro ao salvar endereço");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (!user) return;

    try {
      // Remove default from all
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", address.id);

      if (error) throw error;

      toast.success("Endereço padrão atualizado!");
      fetchAddresses();
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error("Erro ao definir endereço padrão");
    }
  };

  const handleDelete = async () => {
    if (!deleteAddress) return;

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", deleteAddress.id);

      if (error) throw error;

      toast.success("Endereço removido!");
      setDeleteAddress(null);
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Erro ao remover endereço");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Meus Endereços</h1>
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64 mb-1" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Meus Endereços</h1>
        <Button onClick={() => handleOpenDialog()} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Novo Endereço
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Nenhum endereço cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro endereço para facilitar suas compras.
            </p>
            <Button onClick={() => handleOpenDialog()} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Endereço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`border-border ${address.is_default ? "ring-2 ring-primary" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">{address.label}</span>
                    {address.is_default && (
                      <Badge className="bg-primary/10 text-primary border-primary/30">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(address)}
                        title="Definir como padrão"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(address)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteAddress(address)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{address.name}</p>
                  <p>
                    {address.street}, {address.number}
                    {address.complement && ` - ${address.complement}`}
                  </p>
                  <p>{address.neighborhood}</p>
                  <p>
                    {address.city} - {address.state}, CEP: {address.cep}
                  </p>
                  {address.phone && <p>Tel: {address.phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Editar Endereço" : "Novo Endereço"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Apelido *</Label>
                <Input
                  id="label"
                  placeholder="Ex: Casa, Trabalho"
                  value={formData.label}
                  onChange={(e) => handleInputChange("label", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Destinatário *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", formatPhone(e.target.value))}
                />
              </div>
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
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  placeholder="Rua/Avenida"
                  value={formData.street}
                  onChange={(e) => handleInputChange("street", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  placeholder="123"
                  value={formData.number}
                  onChange={(e) => handleInputChange("number", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  placeholder="Apto, Bloco, etc"
                  value={formData.complement}
                  onChange={(e) => handleInputChange("complement", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  placeholder="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Cidade"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  placeholder="UF"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Endereço"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAddress} onOpenChange={() => setDeleteAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Endereço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o endereço "{deleteAddress?.label}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
