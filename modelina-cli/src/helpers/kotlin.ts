import { KOTLIN_JACKSON_PRESET, KotlinFileGenerator } from "@asyncapi/modelina";
import { Flags } from "@oclif/core";
import { BuilderReturnType } from "./generate";

export const KotlinOclifFlags = {
  kotlinJackson: Flags.boolean({
    description: 'Kotlin specific, generate the models with Jackson serialization support',
    required: false,
    default: false
  })
}

/**
 * This function builds all the relevant information for the main generate command
 * 
 * @param flags 
 * @returns 
 */
export function buildKotlinGenerator(flags: any): BuilderReturnType {
  const { packageName, kotlinJackson } = flags;
  const presets = [];
  
  if (packageName === undefined) {
    throw new Error('In order to generate models to Kotlin, we need to know which package they are under. Add `--packageName=PACKAGENAME` to set the desired package name.');
  }

  if (kotlinJackson) { presets.push(KOTLIN_JACKSON_PRESET); }
  const fileGenerator = new KotlinFileGenerator({ presets });
  const fileOptions = {
    packageName
  };
  return {
    fileOptions,
    fileGenerator
  };
}
