import { useEffect, useRef } from "react";
import "@sajanm/nepali-date-picker/dist/nepali.datepicker.v5.0.6.min.js";
import "@sajanm/nepali-date-picker/dist/nepali.datepicker.v5.0.6.min.css";

function NepaliDatePicker(options: any) {
    const inputRef = useRef(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (inputRef.current && !initializedRef.current) {
            // @ts-ignore
            inputRef.current.NepaliDatePicker({
                ...options.options,
                onSelect: (value: any) => {
                    options.onSelect(value);
                },
            });
            initializedRef.current = true;
        }
    }, []);

    return (
        <>
            <input
                ref={inputRef}
                id="nepali-datepicker"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="text"
                placeholder="Select Date"
                autoComplete="off"
            />
        </>
    );
}

export default NepaliDatePicker;
