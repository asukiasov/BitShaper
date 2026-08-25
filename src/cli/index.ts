#!/usr/bin/env node
import { Command } from "commander";
import { runGenerateCommand } from "./commands/generate.js";
import { runListCommand } from "./commands/list.js";
import { runRenderCommand } from "./commands/render.js";

const program = new Command();

program.name("bitshaper").description("Generate and render BitShaper shape IDs.");

program
  .command("render")
  .description("Decode and render a shape ID, writing the SVG to a file.")
  .argument("<shapeId>", "the shape ID to render")
  .requiredOption("-o, --output <file>", "output SVG file path")
  .option("--fill <color>", "fill color for the rendered path")
  .action((shapeId: string, options: { output: string; fill?: string }) => {
    runRenderCommand(shapeId, options.output, { fill: options.fill });
  });

program
  .command("generate")
  .description("Deterministically generate and render a shape from a seed.")
  .requiredOption("--seed <seed>", "seed value")
  .option("--grid <colsxrows>", "grid size, e.g. 4x4")
  .requiredOption("-o, --output <file>", "output SVG file path")
  .action((options: { seed: string; grid?: string; output: string }) => {
    runGenerateCommand(options.output, { seed: options.seed, grid: options.grid });
  });

program
  .command("list")
  .description("List every curated catalog entry.")
  .action(() => {
    runListCommand();
  });

program.parse();
