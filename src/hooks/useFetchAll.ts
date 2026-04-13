import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../config/axios";

/**
 * Standard API response structure
 */
export interface ApiResponse<T> {
    data: T[];
    Success: boolean;
    Message: string | null;
    Errors: string | null;
}

/**
 * Fetch list / collection
 * Example: /api/customers
 */
export function useFetchAll<T>(
    apiUrl: string,
    queryKey: Array<string | number>
) {
    const query = useQuery<ApiResponse<T>>({
        queryKey,
        queryFn: async () => {
            const response = await axiosInstance.get<ApiResponse<T>>(
                import.meta.env.VITE_API_BASE_URL + apiUrl
            );
            return response.data;
        },
        enabled: !!apiUrl,
    });

    return {
        items: query.data,
        isLoadingItems: query.isLoading,
        error: query.error,
        refetchItems: query.refetch,
    };
}

/**
 * Fetch item code / dynamic value
 * Example: /api/datanumber
 */
export function useFetchItemCode<T>(module: string, text: string) {
    const baseURL = import.meta.env.VITE_API_BASE_URL;

    const query = useQuery<ApiResponse<T>>({
        queryKey: ["itemCode", module, text],
        queryFn: async () => {
            const url = `${baseURL}/api/datanumber?module=${module}&text=${text}`;
            const res = await axiosInstance.get<ApiResponse<T>>(url);
            return res.data;
        },
        enabled: !!module && !!text, // prevent empty calls
    });

    return {
        itemCode: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
