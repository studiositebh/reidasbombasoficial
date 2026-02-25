import { useState, useEffect } from "react";
import { 
  Users as UsersIcon, Shield, ShieldCheck, Search, MoreVertical, UserPlus, 
  Loader2, Mail, KeyRound, Pencil, Trash2, Building, UserCog, FileEdit,
  Eye, EyeOff, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "manager" | "collaborator" | "editor";

interface TeamUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  role_created_at: string | null;
  user_created_at: string | null;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  admin: {
    label: "Administrador",
    icon: ShieldCheck,
    color: "bg-red-100 text-red-700",
    description: "Acesso total ao sistema",
  },
  manager: {
    label: "Gerente",
    icon: Building,
    color: "bg-purple-100 text-purple-700",
    description: "Produtos, Pedidos, Clientes, Relatórios",
  },
  collaborator: {
    label: "Colaborador",
    icon: UserCog,
    color: "bg-blue-100 text-blue-700",
    description: "Produtos e Estoque apenas",
  },
  editor: {
    label: "Editor",
    icon: FileEdit,
    color: "bg-green-100 text-green-700",
    description: "Blog e conteúdo apenas",
  },
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create/Edit dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "collaborator" as AppRole,
  });

  // Password reset dialog
  const [passwordDialog, setPasswordDialog] = useState<{ userId: string; email: string | null } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Remove member dialog
  const [removeDialog, setRemoveDialog] = useState<{ userId: string; email: string | null } | null>(null);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-team-users`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar membros");
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching team users:", error);
      toast.error("Erro ao carregar membros do time");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const callManageUserApi = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Sessão expirada");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro na operação");
    }

    return data;
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ email: "", full_name: "", password: "", role: "collaborator" });
    setUserDialogOpen(true);
  };

  const openEditDialog = (user: TeamUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email || "",
      full_name: user.full_name || "",
      password: "",
      role: user.role,
    });
    setUserDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.email.trim()) {
      toast.error("Informe o email do usuário");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        await callManageUserApi({
          action: "update",
          userId: editingUser.user_id,
          email: formData.email.trim(),
          full_name: formData.full_name.trim() || null,
          role: formData.role,
        });
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Create new user
        await callManageUserApi({
          action: "create",
          email: formData.email.trim(),
          full_name: formData.full_name.trim() || null,
          password: formData.password || undefined,
          role: formData.role,
        });
        toast.success("Usuário criado com sucesso!");
      }

      setUserDialogOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error("Error saving user:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordDialog || !newPassword.trim()) {
      toast.error("Informe a nova senha");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      await callManageUserApi({
        action: "reset_password",
        userId: passwordDialog.userId,
        password: newPassword,
      });

      toast.success("Senha alterada com sucesso!");
      setPasswordDialog(null);
      setNewPassword("");
    } catch (error: unknown) {
      console.error("Error resetting password:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao alterar senha");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeDialog) return;

    setIsSubmitting(true);

    try {
      await callManageUserApi({
        action: "delete",
        userId: removeDialog.userId,
      });

      toast.success("Membro removido do time");
      fetchUsers();
    } catch (error: unknown) {
      console.error("Error removing member:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao remover membro");
    } finally {
      setIsSubmitting(false);
      setRemoveDialog(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
  );

  const getRoleBadge = (role: AppRole) => {
    const config = ROLE_CONFIG[role];
    if (!config) return <Badge variant="secondary">{role}</Badge>;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} hover:${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%&*"[Math.floor(Math.random() * 7)];
    // Fill remaining with random chars
    for (let i = 0; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle the password
    const shuffled = password.split("").sort(() => Math.random() - 0.5).join("");
    setNewPassword(shuffled);
    setShowPassword(true);
  };

  return (
    <AdminLayout title="Gestão do Time">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Membros do Time
              </CardTitle>
              <CardDescription>
                Gerencie administradores, gerentes, colaboradores e editores do sistema.
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum membro encontrado" : "Nenhum membro no time ainda"}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar primeiro membro
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Membro desde</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role];
                    const RoleIcon = roleConfig?.icon || Shield;

                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <RoleIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email || "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{formatDate(user.role_created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setPasswordDialog({ userId: user.user_id, email: user.email })}
                              >
                                <KeyRound className="h-4 w-4 mr-2" />
                                Alterar Senha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setRemoveDialog({ userId: user.user_id, email: user.email })}
                                className="text-destructive"
                                disabled={user.user_id === currentUser?.id}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover do Time
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Membro" : "Adicionar Membro ao Time"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize as informações do membro."
                : "Adicione um novo membro à equipe."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={formData.full_name}
                onChange={(e) => setFormData((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha (opcional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Deixe vazio para enviar link de definição"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Se não informar uma senha, o usuário receberá um email para definir sua própria senha.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData((f) => ({ ...f, role: v as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => {
                    const config = ROLE_CONFIG[role];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <span className="font-medium">{config.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({config.description})
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!passwordDialog} onOpenChange={(open) => {
        if (!open) {
          setPasswordDialog(null);
          setNewPassword("");
          setShowPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {passwordDialog?.email || "o usuário"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password">Nova Senha *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generatePassword}
                  className="h-7 text-xs gap-1.5 text-primary hover:text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gerar Senha
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialog(null);
              setNewPassword("");
              setShowPassword(false);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeDialog?.email}</strong> do time?
              Esta ação remove apenas o acesso ao painel administrativo, não exclui a conta do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
