"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  adminGetOrder,
  adminGetProduct,
  adminGetStats,
  adminListOrders,
  adminListProducts,
  adminListReviews,
  adminListVariants,
  listCategories,
} from "@/lib/api/client";
import { adminKeys } from "./keys";
import { adminProductsQuery, type AdminProductFilters } from "./lib/filters";
import {
  adminOrdersQuery,
  adminReviewsQuery,
  type AdminOrderFilters,
  type AdminReviewFilters,
} from "./lib/order-filters";

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

/** One page of the orders table; the last page stays up while the next loads. */
export function useAdminOrders(filters: AdminOrderFilters) {
  return useQuery({
    queryKey: adminKeys.orderList(filters),
    queryFn: async ({ signal }) => {
      const { data } = await adminListOrders({
        query: adminOrdersQuery(filters),
        signal,
        throwOnError: true,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(number: number) {
  return useQuery({
    queryKey: adminKeys.order(number),
    queryFn: async ({ signal }) => {
      const { data } = await adminGetOrder({
        path: { number },
        signal,
        throwOnError: true,
      });
      return data.data;
    },
  });
}

export function useAdminReviews(filters: AdminReviewFilters) {
  return useQuery({
    queryKey: adminKeys.reviewList(filters),
    queryFn: async ({ signal }) => {
      const { data } = await adminListReviews({
        query: adminReviewsQuery(filters),
        signal,
        throwOnError: true,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
