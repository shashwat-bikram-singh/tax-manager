import { useEffect, useRef, useState } from "react";
import "@sajanm/nepali-date-picker/dist/nepali.datepicker.v5.0.6.min.js";
import "@sajanm/nepali-date-picker/dist/nepali.datepicker.v5.0.6.min.css";

interface NepaliDatePickerProps {
    id?: string;
    value?: string;
    onSelect?: (value: { value: string }) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    name?: string;
}

function NepaliDatePicker({ id, value, onSelect, placeholder = "", className, name }: NepaliDatePickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (inputRef.current && !initialized) {
            // @ts-ignore
            inputRef.current.NepaliDatePicker({
                onSelect: (selectedValue: any) => {
                    const dateValue = typeof selectedValue === 'string' ? selectedValue : selectedValue.np || selectedValue.value || JSON.stringify(selectedValue);
                    onSelect?.({ value: dateValue });
                },
            });
            setInitialized(true);
        }
    }, [initialized, onSelect]);

    useEffect(() => {
        if (inputRef.current && initialized && value) {
            inputRef.current.value = value;
        }
    }, [value, initialized]);

    return (
        <>
            <input
                ref={inputRef}
                id={id || "nepali-datepicker"}
                name={name || "nepali-datepicker"}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className || ""}`}
                type="text"
                placeholder={placeholder}
                autoComplete="off"
            />
        </>
    );
}

export default NepaliDatePicker;
