import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FolderTree, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  product_count?: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");

      if (catsError) throw catsError;

      // Count products per category
      const { data: products } = await supabase
        .from("products")
        .select("category_id");

      const categoriesWithCount = (cats || []).map(cat => ({
        ...cat,
        product_count: (products || []).filter(p => p.category_id === cat.id).length
      }));

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-generate slug
  useEffect(() => {
    if (!editingCategory && name) {
      const generatedSlug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generatedSlug);
    }
  }, [name, editingCategory]);

  const openDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || "");
      setParentId(category.parent_id);
      setIsActive(category.is_active);
      setImagePreview(category.image_url);
    } else {
      setEditingCategory(null);
      setName("");
      setSlug("");
      setDescription("");
      setParentId(null);
      setIsActive(true);
      setImagePreview(null);
    }
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const path = `categories/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("products")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("products")
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const saveCategory = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = editingCategory?.image_url || null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const categoryData = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        parent_id: parentId,
        is_active: isActive,
        image_url: imageUrl,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({
            ...categoryData,
            sort_order: categories.length,
          });

        if (error) throw error;
        toast.success("Categoria criada!");
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma categoria com esse slug");
      } else {
        toast.error("Erro ao salvar categoria");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Categoria excluída");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir categoria");
    } finally {
      setDeleteId(null);
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = categories.find(c => c.id === parentId);
    return parent?.name || "-";
  };

  return (
    <AdminLayout title="Categorias">
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Categorias
          </CardTitle>
          <Button onClick={() => openDialog()} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhuma categoria cadastrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Imagem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Categoria Pai</TableHead>
                    <TableHead className="text-center">Produtos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                          {category.image_url ? (
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FolderTree className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{category.slug}</TableCell>
                      <TableCell className="text-gray-500">{getParentName(category.parent_id)}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                          {category.product_count || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            category.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {category.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteId(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <FolderTree className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="category-image"
                  />
                  <Label
                    htmlFor="category-image"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Enviar Imagem
                  </Label>
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-red-600"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bombas Submersas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bombas-submersas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da categoria"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria Pai</Label>
              <Select
                value={parentId || "none"}
                onValueChange={(value) => setParentId(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (categoria raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (categoria raiz)</SelectItem>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Categoria Ativa</Label>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCategory} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Os produtos vinculados
              ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCategory} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}