import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import NepaliDatePicker from "../ui/NepaliDatePicker";

// -------------------- SCHEMA --------------------
const Schema = z.object({
  dateFrom: z.string().min(1, "From date is required"),
  dateTo: z.string().min(1, "To date is required"),
});

type ReportFormValues = z.infer<typeof Schema>;

type ReportDateProps = {
  onSearch: (fromdate: string, todate: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
};

// -------------------- COMPONENT --------------------
export default function ReportDate({ onSearch, onCancel, isLoading }: ReportDateProps) {

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      dateFrom: "",
      dateTo: "",
    },
  });

  // -------------------- SUBMIT --------------------
  const onSubmit = (values: ReportFormValues) => {
    onSearch(values.dateFrom, values.dateTo);
  };

  // -------------------- UI --------------------
  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700">
          User Wise Income Report
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="rounded-full"
        >
          <X className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FROM DATE */}
            <FormField
              control={form.control}
              name="dateFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date From</FormLabel>
                  <FormControl>
                    <NepaliDatePicker
                      id="nepali-datepicker"
                      className="w-full"
                      name="nepali-datepicker"
                      label="Select Date"
                      value={field.value}
                      onSelect={(value: any) => {
                        field.onChange(value.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TO DATE */}
            <FormField
              control={form.control}
              name="dateTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date To</FormLabel>
                  <FormControl>

                    <NepaliDatePicker
                      id="nepali-datepicker"
                      name="nepali-datepicker"
                      label="Select Date"
                      value={field.value}
                      onSelect={(value: any) => {
                        field.onChange(value.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Loading..." : "Get Report"}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
