import { formatLtx } from "#/format/format_ltx";
import { GAME_DATA_LTX_CONFIGS_DIR } from "#/globals";
import { filterStagedLtxPaths } from "#/hooks/filter_staged_ltx_paths";

/**
 * Run the project LTX formatter from lint-staged, limited to the staged files.
 */
async function run(): Promise<void> {
  const staged: Array<string> = filterStagedLtxPaths(process.argv.slice(2), GAME_DATA_LTX_CONFIGS_DIR);

  if (!staged.length) {
    return;
  }

  await formatLtx({ paths: staged });
}

run().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
