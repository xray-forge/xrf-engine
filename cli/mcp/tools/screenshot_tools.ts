import * as fs from "node:fs";
import * as path from "node:path";

import { IMcpTool } from "#/mcp/mcp_tool_types";
import { IGameResponse } from "#/mcp/McpPipeClient";
import { answer, IGameToolsContext, schema, sleep, text } from "#/mcp/tools/tool_kit";
import { Nullable } from "#/utils/types";

const SCREENSHOT_WAIT_MS: number = 10_000;

/**
 * Wait for a screenshot written after a moment.
 *
 * @param directory - Folder screenshots are written to.
 * @param since - Moment the screenshot was asked for, in milliseconds.
 * @param timeoutMs - How long to wait.
 * @returns Path of the newest screenshot written since, or null.
 */
export async function waitForScreenshot(
  directory: string,
  since: number,
  timeoutMs: number
): Promise<Nullable<string>> {
  const deadline: number = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(directory)) {
      const newest: Nullable<{ file: string; time: number }> = fs
        .readdirSync(directory)
        .filter((file) => file.startsWith("ss_") && file.endsWith(".jpg"))
        .map((file) => ({ file, time: fs.statSync(path.join(directory, file)).mtimeMs }))
        .filter((it) => it.time >= since - 1000)
        .reduce<Nullable<{ file: string; time: number }>>(
          (best, it) => (!best || it.time > best.time ? it : best),
          null
        );

      if (newest) {
        return path.join(directory, newest.file);
      }
    }

    await sleep(200);
  }

  return null;
}

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools showing the game.
 */
export function createScreenshotTools(context: IGameToolsContext): Array<IMcpTool> {
  return [
    {
      name: "game_screenshot",
      description:
        "Take a screenshot of the running game and return the image, scaled down to a width. The full picture is " +
        "kept under target/mcp/screenshots.",
      inputSchema: schema({
        width: {
          type: "integer",
          minimum: 320,
          maximum: 7680,
          default: 1600,
          description: "Width to scale the image down to.",
        },
      }),
      call: async ({ width }) => {
        const since: number = Date.now();
        const response: IGameResponse = await context.client.request("screenshot");

        if (!response.ok) {
          return answer(response);
        }

        const file: Nullable<string> = await waitForScreenshot(
          (await context.getPaths()).screenshots,
          since,
          SCREENSHOT_WAIT_MS
        );

        if (!file) {
          return text("The game took no screenshot in time.", true);
        }

        const kept: string = context.keepScreenshot(file);
        const image: Buffer = await context.scaleScreenshot(kept, width as number);

        return {
          content: [
            { type: "image", data: image.toString("base64"), mimeType: "image/jpeg" },
            { type: "text", text: kept },
          ],
        };
      },
    },
  ];
}
