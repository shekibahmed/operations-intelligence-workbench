import { handleExportDownload } from "@/lib/server/export-download";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspace: string; dataset: string; format: string }> },
): Promise<Response> {
  const { workspace, dataset, format } = await context.params;
  return handleExportDownload(workspace, dataset, format);
}
