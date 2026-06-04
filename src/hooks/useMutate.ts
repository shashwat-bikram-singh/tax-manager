import axiosInstance from "../config/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useMutate<T extends { id?: number }>(
    apiUrl: string,
    entityName: string
) {
    const queryClient = useQueryClient();
    const baseURL = import.meta.env.VITE_API_BASE_URL;

    /**
     * CREATE
     */
    const createMutation = useMutation<T, Error, Omit<T, "id"> | FormData | { ids: number[] }>({
        mutationFn: async (data) => {
            const isFormData = data instanceof FormData;

            if (
                data &&
                typeof data === "object" &&
                !isFormData &&
                "ids" in data &&
                Array.isArray((data as { ids: number[] }).ids)
            ) {
                const jsonString = JSON.stringify((data as { ids: number[] }).ids);
                const response = await axiosInstance.post<T>(
                    `${baseURL}${apiUrl}?ids=${jsonString}`,
                    {},
                    { headers: { "Content-Type": "application/json" } }
                );
                return response.data;
            }

            const response = await axiosInstance.post<T>(
                baseURL + apiUrl,
                data, {
                // headers: {
                //     "Content-Type": "multipart/form-data",
                // },
                headers: {
                    ...(isFormData
                        ? { "Content-Type": "multipart/form-data" } // let Axios handle multipart headers
                        : { "Content-Type": "application/json" }),
                },
            }
            );
            return response.data;
        },
        onSuccess: () => {
            // toast.success(`${entityName} created successfully`);
            queryClient.invalidateQueries({ queryKey: [entityName] });
        },
        onError: (error) => {
            // toast.error(`Failed to create ${entityName}`);
            console.error(`Create ${entityName} error:`, error);
        },
    });

    /**
     * UPDATE
     */
    const updateMutation = useMutation<T, Error, T | FormData>({
        mutationFn: async (data: T | FormData) => {
            let id: any;

            if (data instanceof FormData) {
                id = data.get("id");
            } else {
                id = (data as T).id;
            }

            if (!id) {
                throw new Error("Id is required for update operation");
            }

            const isFormData = data instanceof FormData;
            const response = await axiosInstance.post<T>(
                `${baseURL}${apiUrl}?id=${id}`,
                data, {
                headers: {
                    ...(isFormData
                        ? { "Content-Type": "multipart/form-data" } // let Axios handle multipart headers
                        : { "Content-Type": "application/json" }),
                },
            }
            );
            return response.data;
        },
        onSuccess: () => {
            // toast.success(`${entityName} updated successfully`);
            queryClient.invalidateQueries({ queryKey: [entityName] });
        },
        onError: (error) => {
            // toast.error(`Failed to update ${entityName}`);
            console.error(`Update ${entityName} error:`, error);
        },
    });

    /**
     * DELETE
     */
    const deleteMutation = useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await axiosInstance.delete(
                `${baseURL}${apiUrl}?id=${id}`
            );
        },
        onSuccess: () => {
            // toast.success(`${entityName} deleted successfully`);
            queryClient.invalidateQueries({ queryKey: [entityName] });
        },
        onError: (error) => {
            // toast.error(`Failed to delete ${entityName}`);
            console.error(`Delete ${entityName} error:`, error);
        },
    });

    return {
        create: {
            mutate: createMutation.mutate,
            mutateAsync: createMutation.mutateAsync,
            isLoading: createMutation.isPending,
            isError: createMutation.isError,
            error: createMutation.error,
            isSuccess: createMutation.isSuccess,
            data: createMutation.data,
            reset: createMutation.reset,
        },
        update: {
            mutate: updateMutation.mutate,
            mutateAsync: updateMutation.mutateAsync,
            isLoading: updateMutation.isPending,
            isError: updateMutation.isError,
            error: updateMutation.error,
            isSuccess: updateMutation.isSuccess,
            data: updateMutation.data,
            reset: updateMutation.reset,
        },
        delete: {
            mutate: deleteMutation.mutate,
            mutateAsync: deleteMutation.mutateAsync,
            isLoading: deleteMutation.isPending,
            isError: deleteMutation.isError,
            error: deleteMutation.error,
            isSuccess: deleteMutation.isSuccess,
            reset: deleteMutation.reset,
        },
    };
}
