import { useState } from "react";
// ─── Conversion Constants ─────────────────────────────────────────────────────
const TERAI_BIGHA_TO_SQM = 6772.63;
const TERAI_KATTHA_TO_SQM = TERAI_BIGHA_TO_SQM / 20;
const TERAI_DHUR_TO_SQM = TERAI_KATTHA_TO_SQM / 20;

const HILLY_ROPANI_TO_SQM = 508.72;
const HILLY_AANA_TO_SQM = HILLY_ROPANI_TO_SQM / 16;
const HILLY_PAISA_TO_SQM = HILLY_AANA_TO_SQM / 4;
const HILLY_DAAM_TO_SQM = HILLY_PAISA_TO_SQM / 4;
const SQM_TO_SQFT = 10.7639;

function calcTerai(bigha = 0, kattha = 0, dhur = 0) {
    return (bigha * TERAI_BIGHA_TO_SQM) + (kattha * TERAI_KATTHA_TO_SQM) + (dhur * TERAI_DHUR_TO_SQM);
}
function calcHilly(ropani = 0, aana = 0, paisa = 0, daam = 0) {
    return (ropani * HILLY_ROPANI_TO_SQM) + (aana * HILLY_AANA_TO_SQM) + (paisa * HILLY_PAISA_TO_SQM) + (daam * HILLY_DAAM_TO_SQM);
}

function convertSqmToTerai(sqm: number) {
    let remaining = sqm;

    const bigha = Math.floor(remaining / TERAI_BIGHA_TO_SQM);
    remaining -= bigha * TERAI_BIGHA_TO_SQM;

    const kattha = Math.floor(remaining / TERAI_KATTHA_TO_SQM);
    remaining -= kattha * TERAI_KATTHA_TO_SQM;

    const dhur = remaining / TERAI_DHUR_TO_SQM;

    return { bigha, kattha, dhur };
}


function convertSqmToHilly(sqm: number) {
    let remaining = sqm;

    const ropani = Math.floor(remaining / HILLY_ROPANI_TO_SQM);
    remaining -= ropani * HILLY_ROPANI_TO_SQM;

    const aana = Math.floor(remaining / HILLY_AANA_TO_SQM);
    remaining -= aana * HILLY_AANA_TO_SQM;

    const paisa = Math.floor(remaining / HILLY_PAISA_TO_SQM);
    remaining -= paisa * HILLY_PAISA_TO_SQM;

    const daam = remaining / HILLY_DAAM_TO_SQM;

    return { ropani, aana, paisa, daam };
}




// ─── Measurement Converter Card ───────────────────────────────────────────────
export function MeasurementConverter() {
    const [measureType, setMeasureType] = useState<"terai" | "hilly">("terai");
    const [terai, setTerai] = useState({ bigha: "", kattha: "", dhur: "" });
    const [hilly, setHilly] = useState({ ropani: "", aana: "", paisa: "", daam: "" });
    const [sqmInput, setSqmInput] = useState("");
    const reverseTerai = convertSqmToTerai(Number(sqmInput) || 0);
    const reverseHilly = convertSqmToHilly(Number(sqmInput) || 0);
    const [mode, setMode] = useState<"forward" | "reverse">("forward");

    const sqm = measureType === "terai"
        ? calcTerai(Number(terai.bigha), Number(terai.kattha), Number(terai.dhur))
        : calcHilly(Number(hilly.ropani), Number(hilly.aana), Number(hilly.paisa), Number(hilly.daam));

    const sqft = sqm * SQM_TO_SQFT;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-base">straighten</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Measurement Converter</h3>
            </div>

            {/* Region Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
                <button
                    type="button"
                    onClick={() => setMeasureType("terai")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${measureType === "terai" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >Terai (B·K·D)</button>
                <button
                    type="button"
                    onClick={() => setMeasureType("hilly")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${measureType === "hilly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >Hilly (R·A·P·D)</button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 bg-indigo-50 border border-indigo-100 p-1 rounded-lg text-xs font-medium">
                <button
                    type="button"
                    onClick={() => setMode("forward")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${mode === "forward" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-500 hover:text-indigo-700"
                        }`}
                >
                    Standard → m²
                </button>
                <button
                    type="button"
                    onClick={() => setMode("reverse")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${mode === "reverse" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-500 hover:text-indigo-700"
                        }`}
                >
                    m² → Standard
                </button>
            </div>

            {/* Forward mode: Standard inputs */}
            {mode === "forward" && (
                <>
                    {measureType === "terai" ? (
                        <div className="grid grid-cols-3 gap-2">
                            {(["bigha", "kattha", "dhur"] as const).map((unit) => (
                                <div key={unit}>
                                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{unit}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={terai[unit]}
                                        onChange={(e) => setTerai((p) => ({ ...p, [unit]: e.target.value }))}
                                        className="w-full text-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                            {(["ropani", "aana", "paisa", "daam"] as const).map((unit) => (
                                <div key={unit}>
                                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{unit.charAt(0).toUpperCase() + unit.slice(1)}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={hilly[unit]}
                                        onChange={(e) => setHilly((p) => ({ ...p, [unit]: e.target.value }))}
                                        className="w-full text-center bg-gray-50 border border-gray-200 rounded-lg px-1 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Standardized Area Result */}
                    <div className="bg-[#0f2646] rounded-xl p-4 text-white">
                        <p className="text-[10px] uppercase tracking-widest text-blue-200 font-semibold mb-1">Standardized Area</p>
                        <p className="text-3xl font-black tracking-tight">{sqm.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-blue-300 text-xs mt-0.5">Square Meters (m²)</p>
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xl font-bold">{sqft.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-blue-300 text-xs mt-0.5">Square Feet (sq ft)</p>
                        </div>
                    </div>
                </>
            )}

            {/* Reverse mode: SQM input */}
            {mode === "reverse" && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Enter Square Meters</label>
                        <input
                            type="number"
                            placeholder="e.g. 500"
                            value={sqmInput}
                            onChange={(e) => setSqmInput(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-2">
                            {measureType === "terai" ? "Terai Equivalent" : "Hilly Equivalent"}
                        </p>
                        {measureType === "terai" ? (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                    <p className="text-lg font-black text-indigo-700">{reverseTerai.bigha}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Bigha</p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                    <p className="text-lg font-black text-indigo-700">{reverseTerai.kattha}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Kattha</p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                    <p className="text-lg font-black text-indigo-700">{reverseTerai.dhur.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Dhur</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                {[
                                    { label: "Ropani", val: reverseHilly.ropani },
                                    { label: "Aana", val: reverseHilly.aana },
                                    { label: "Paisa", val: reverseHilly.paisa },
                                    { label: "Daam", val: reverseHilly.daam.toFixed(2) },
                                ].map((item) => (
                                    <div key={item.label} className="bg-white rounded-lg p-2 border border-indigo-100">
                                        <p className="text-sm font-black text-indigo-700">{item.val}</p>
                                        <p className="text-[9px] text-gray-400 font-semibold uppercase">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Conversion note */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-amber-800 leading-snug">
                    <span className="font-bold">Note:</span>{" "}
                    1 {measureType === "terai" ? `Bigha = ${TERAI_BIGHA_TO_SQM.toLocaleString()} m²` : `Ropani = ${HILLY_ROPANI_TO_SQM.toLocaleString()} m²`} (1964 standard)
                </p>
            </div>
        </div>
    );
}

