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
            const response = await axiosInstance.get<Response<T>>(
                `${import.meta.env.VITE_API_BASE_URL}${apiUrl}?${otherFields}`,
            );
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

