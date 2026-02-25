import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Star, Check, X, Clock, MessageSquare, User, Package,
  ThumbsUp, ThumbsDown, AlertTriangle, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  reviewer_name: string | null;
  created_at: string;
  products?: {
    title: string;
    slug: string;
  };
}

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  averageRating: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ 
  review, 
  onApprove, 
  onReject, 
  isUpdating 
}: { 
  review: Review; 
  onApprove: () => void; 
  onReject: () => void;
  isUpdating: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StarRating rating={review.rating} />
                  {review.is_verified_purchase && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Compra Verificada
                    </Badge>
                  )}
                  <Badge 
                    variant={review.is_approved ? "default" : "outline"}
                    className={review.is_approved ? "bg-green-500" : ""}
                  >
                    {review.is_approved ? "Aprovada" : "Pendente"}
                  </Badge>
                </div>
                {review.title && (
                  <h3 className="font-semibold text-foreground">{review.title}</h3>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(review.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>

            {/* Content */}
            {review.content && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.content}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {review.reviewer_name || "Cliente Anônimo"}
              </span>
              {review.products && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {review.products.title}
                </span>
              )}
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="flex lg:flex-col items-center justify-center gap-2 p-4 bg-muted/30 border-t lg:border-t-0 lg:border-l">
            {!review.is_approved && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700 gap-1"
                onClick={onApprove}
                disabled={isUpdating}
              >
                <Check className="h-4 w-4" />
                Aprovar
              </Button>
            )}
            <Button
              size="sm"
              variant={review.is_approved ? "outline" : "destructive"}
              className="gap-1"
              onClick={onReject}
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
              {review.is_approved ? "Remover" : "Rejeitar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  // Fetch reviews with product info
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("product_reviews")
        .select(`
          *,
          products:product_id (
            title,
            slug
          )
        `)
        .order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("is_approved", false);
      } else if (activeTab === "approved") {
        query = query.eq("is_approved", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Review[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-reviews-stats"],
    queryFn: async () => {
      const [totalResult, pendingResult, approvedResult] = await Promise.all([
        supabase.from("product_reviews").select("rating", { count: "exact" }),
        supabase.from("product_reviews").select("id", { count: "exact" }).eq("is_approved", false),
        supabase.from("product_reviews").select("id", { count: "exact" }).eq("is_approved", true),
      ]);

      const ratings = totalResult.data?.map(r => r.rating) || [];
      const avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        averageRating: avgRating,
      } as ReviewStats;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_approved: true })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews-stats"] });
      toast.success("Avaliação aprovada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao aprovar avaliação");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews-stats"] });
      toast.success("Avaliação removida com sucesso!");
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao remover avaliação");
    },
  });

  const handleReject = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setDeleteDialogOpen(true);
  };

  const isUpdating = approveMutation.isPending || deleteMutation.isPending;

  return (
    <AdminLayout title="Avaliações">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total de Avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <ThumbsUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.approved || 0}</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || "0.0"}</p>
                  <p className="text-xs text-muted-foreground">Média Geral</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Gerenciar Avaliações
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pendentes
                  {stats?.pending ? (
                    <Badge variant="secondary" className="ml-1">{stats.pending}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <Check className="h-4 w-4" />
                  Aprovadas
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Todas
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onApprove={() => approveMutation.mutate(review.id)}
                      onReject={() => handleReject(review.id)}
                      isUpdating={isUpdating}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhuma avaliação encontrada</p>
                    <p className="text-sm">
                      {activeTab === "pending" 
                        ? "Não há avaliações pendentes de moderação."
                        : activeTab === "approved"
                        ? "Nenhuma avaliação foi aprovada ainda."
                        : "Ainda não há avaliações de produtos."}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remover Avaliação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta avaliação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => reviewToDelete && deleteMutation.mutate(reviewToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
