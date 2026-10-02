import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(cp.execFile);

// Windows PowerShell ships System.Drawing, so scaling needs no package; paths and width arrive through the environment.
const SCALE_SCRIPT: string = [
  "Add-Type -AssemblyName System.Drawing",
  "$source = [System.Drawing.Image]::FromFile($env:XRF_SHOT_SOURCE)",
  "try {",
  "  $scale = [Math]::Min(1.0, [double]$env:XRF_SHOT_WIDTH / $source.Width)",
  "  $width = [int][Math]::Round($source.Width * $scale)",
  "  $height = [int][Math]::Round($source.Height * $scale)",
  "  $target = New-Object System.Drawing.Bitmap $width, $height",
  "  $graphics = [System.Drawing.Graphics]::FromImage($target)",
  "  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic",
  "  $graphics.DrawImage($source, 0, 0, $width, $height)",
  "  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }",
  "  $parameters = New-Object System.Drawing.Imaging.EncoderParameters 1",
  "  $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter " +
    "([System.Drawing.Imaging.Encoder]::Quality, [long]85)",
  "  $target.Save($env:XRF_SHOT_TARGET, $codec, $parameters)",
  "  $graphics.Dispose()",
  "  $target.Dispose()",
  "} finally {",
  "  $source.Dispose()",
  "}",
].join("\n");

/**
 * Move a screenshot the game wrote into a folder of agent screenshots, out of the owner's own.
 * It copies rather than renames, as the game folder may be on another drive.
 *
 * @param file - Screenshot the game wrote.
 * @param directory - Folder to keep it in.
 * @returns Path of the kept screenshot.
 */
export function moveScreenshot(file: string, directory: string): string {
  const target: string = path.join(directory, path.basename(file));

  fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(file, target);
  fs.rmSync(file);

  return target;
}

/**
 * Scale a JPEG screenshot down to a width, as a full one takes megabytes in every answer.
 *
 * @param file - Screenshot to scale.
 * @param width - Width to scale down to; narrower pictures keep their size.
 * @returns JPEG bytes, the original ones where Windows imaging is unavailable.
 */
export async function scaleScreenshot(file: string, width: number): Promise<Buffer> {
  const target: string = path.join(os.tmpdir(), `xrf-mcp-shot-${process.pid}-${Date.now()}.jpg`);

  try {
    await execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", SCALE_SCRIPT], {
      env: { ...process.env, XRF_SHOT_SOURCE: file, XRF_SHOT_TARGET: target, XRF_SHOT_WIDTH: String(width) },
      windowsHide: true,
    });

    return fs.readFileSync(target);
  } catch {
    return fs.readFileSync(file);
  } finally {
    fs.rmSync(target, { force: true });
  }
}
