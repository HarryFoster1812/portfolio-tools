import init, { WasmOBDDEngine, validate_formula }
from "$lib/wasm/obdd/pkg/obdd.js?init";

let wasmReady = false;

export async function initWasm() {
    if (!wasmReady) {
        await init();
        wasmReady = true;
    }
}

export function isValidFormula(input: string): boolean {
    return validate_formula(input);
}

export class Engine {
    private engine: WasmOBDDEngine;

    constructor(input: string, ordering: string[]) {
        this.engine = new WasmOBDDEngine(input, ordering);
    }

    step() {
        this.engine.step();
    }

    stepBack() {
        this.engine.step_back();
    }

    getState() {
        return this.engine.get_state();
    }
}
