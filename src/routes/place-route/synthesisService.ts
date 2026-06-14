import { runYosys } from '@yowasp/yosys';

export async function synthesizeVerilog(verilogSrc: string): Promise<string> {
  const inputFiles = {
    'design.v': verilogSrc
  };

  const args = [
    '-p', 
    'read_verilog design.v; hierarchy -auto-top; proc; opt; techmap; opt; write_blif output.blif'
  ];

  try {
    //  Fire up the Wasm virtual sandbox loop
    const outputFiles = await runYosys(args, inputFiles);

    // Safely extract the compiled binary assets out of the memory block
    const blifText = outputFiles['output.blif'];
    
    if (!blifText) {
      throw new Error("Yosys executed but failed to output a .blif file asset.");
    }

    return blifText;
  } catch (error) {
    console.error("YoWASP Core Engine Synthesis Exception:", error);
    throw error;
  }
}
