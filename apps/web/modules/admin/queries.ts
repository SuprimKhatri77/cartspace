"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  adminGetProduct,
  adminGetStats,
  adminListProducts,
  adminListVariants,
  listCategories,
} from "@/lib/api/client";
import { adminKeys } from "./keys";
import { adminProductsQuery, type AdminProductFilters } from "./lib/filters";

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async ({ signal }) => {
      const { data } = await adminGetStats({ signal, throwOnError: true });
      return data.data;
    },
    staleTime: 30_000,
  });
}

/** One page of the products table; the last page stays up while the next loads. */
export function useAdminProducts(filters: AdminProductFilters) {
  return useQuery({
    queryKey: adminKeys.productList(filters),
    queryFn: async ({ signal }) => {
      const { data } = await adminListProducts({
        query: adminProductsQuery(filters),
        signal,
        throwOnError: true,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: async ({ signal }) => {
      const { data } = await adminGetProduct({
        path: { productID: id },
        signal,
        throwOnError: true,
      });
      return data.data;
    },
  });
}

export function useAdminVariants(productId: string) {
  return useQuery({
    queryKey: adminKeys.variants(productId),
    queryFn: async ({ signal }) => {
      const { data } = await adminListVariants({
        path: { productID: productId },
        signal,
        throwOnError: true,
      });
      return data.data;
    },
  });
}

/** The whole category tree (it is small: one request, no pages). */
export function useCategoryTree() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: async ({ signal }) => {
      const { data } = await listCategories({ signal, throwOnError: true });
      return data.data;
    },
    staleTime: 60_000,
  });
}
