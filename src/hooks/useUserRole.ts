import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "collaborator" | "editor" | null;

interface RolePermissions {
  // Sections
  canViewDashboard: boolean;
  canViewProducts: boolean;
  canViewPromotions: boolean;
  canViewCategories: boolean;
  canViewAttributes: boolean;
  canViewOrders: boolean;
  canViewCustomers: boolean;
  canViewLeads: boolean;
  canViewReviews: boolean;
  canViewCoupons: boolean;
  canViewReports: boolean;
  canViewUsers: boolean;
  canViewPayments: boolean;
  canViewMarketplace: boolean;
  canViewSettings: boolean;
  // Future: Blog for editor role
  canViewBlog: boolean;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<Exclude<AppRole, null>, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewProducts: true,
    canViewPromotions: true,
    canViewCategories: true,
    canViewAttributes: true,
    canViewOrders: true,
    canViewCustomers: true,
    canViewLeads: true,
    canViewReviews: true,
    canViewCoupons: true,
    canViewReports: true,
    canViewUsers: true,
    canViewPayments: true,
    canViewMarketplace: true,
    canViewSettings: true,
    canViewBlog: true,
  },
  manager: {
    canViewDashboard: true,
    canViewProducts: true,
    canViewPromotions: true,
    canViewCategories: true,
    canViewAttributes: true,
    canViewOrders: true,
    canViewCustomers: true,
    canViewLeads: true,
    canViewReviews: true,
    canViewCoupons: true,
    canViewReports: true,
    canViewUsers: false,
    canViewPayments: false,
    canViewMarketplace: false,
    canViewSettings: false,
    canViewBlog: false,
  },
  collaborator: {
    canViewDashboard: false,
    canViewProducts: true,
    canViewPromotions: false,
    canViewCategories: true,
    canViewAttributes: true,
    canViewOrders: false,
    canViewCustomers: false,
    canViewLeads: false,
    canViewReviews: false,
    canViewCoupons: false,
    canViewReports: false,
    canViewUsers: false,
    canViewPayments: false,
    canViewMarketplace: false,
    canViewSettings: false,
    canViewBlog: false,
  },
  editor: {
    canViewDashboard: false,
    canViewProducts: false,
    canViewPromotions: false,
    canViewCategories: false,
    canViewAttributes: false,
    canViewOrders: false,
    canViewCustomers: false,
    canViewLeads: false,
    canViewReviews: false,
    canViewCoupons: false,
    canViewReports: false,
    canViewUsers: false,
    canViewPayments: false,
    canViewMarketplace: false,
    canViewSettings: false,
    canViewBlog: true, // Editor only sees Blog
  },
};

const DEFAULT_PERMISSIONS: RolePermissions = {
  canViewDashboard: false,
  canViewProducts: false,
  canViewPromotions: false,
  canViewCategories: false,
  canViewAttributes: false,
  canViewOrders: false,
  canViewCustomers: false,
  canViewLeads: false,
  canViewReviews: false,
  canViewCoupons: false,
  canViewReports: false,
  canViewUsers: false,
  canViewPayments: false,
  canViewMarketplace: false,
  canViewSettings: false,
  canViewBlog: false,
};

export function useUserRole() {
  const { user, isLoading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setPermissions(DEFAULT_PERMISSIONS);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.log("[useUserRole] No role found for user:", user.id);
        setRole(null);
        setPermissions(DEFAULT_PERMISSIONS);
      } else {
        const userRole = data.role as AppRole;
        console.log("[useUserRole] User role:", userRole);
        setRole(userRole);
        setPermissions(userRole ? ROLE_PERMISSIONS[userRole] : DEFAULT_PERMISSIONS);
      }
    } catch (error) {
      console.error("[useUserRole] Error fetching role:", error);
      setRole(null);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [authLoading, fetchRole]);

  const hasPermission = useCallback(
    (permission: keyof RolePermissions): boolean => {
      return permissions[permission];
    },
    [permissions]
  );

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isCollaborator = role === "collaborator";
  const isEditor = role === "editor";

  return {
    role,
    isLoading: authLoading || isLoading,
    permissions,
    hasPermission,
    isAdmin,
    isManager,
    isCollaborator,
    isEditor,
    refetch: fetchRole,
  };
}

export type { RolePermissions };
