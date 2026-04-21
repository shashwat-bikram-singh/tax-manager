import axiosInstance from "@/config/axios";
import { useQuery } from "@tanstack/react-query";

interface Response<T> {
    Data: T[];
    Success: boolean;
    Message: string | null;
    Errors: string | null;
}

export function useFetchOne<T>(
    apiUrl: string,
    entityName: string,
    identifier?: number | undefined,
    otherFields?: string | undefined
) {

    const itemQuery = useQuery<Response<T>>({
        queryKey: [entityName, identifier],
        queryFn: async () => {
            if (!identifier) {
                throw new Error("Id is required");
            }
            // Build URL with id parameter and any other fields
            let url = `${import.meta.env.VITE_API_BASE_URL}${apiUrl}?id=${identifier}`;
            if (otherFields) {
                url += `&${otherFields}`;
            }
            const response = await axiosInstance.get<Response<T>>(url);
            return response.data;
        },
        enabled: !!identifier,
    });

    return {
        data: itemQuery.data?.Data[0],
        isLoading: itemQuery.isLoading,
        error: itemQuery.error,
        refetch: itemQuery.refetch,
    };
}

