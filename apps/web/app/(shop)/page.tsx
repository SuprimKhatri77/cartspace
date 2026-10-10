import { getHealth } from "@repo/api-client/server";
import { serverClient } from "@/lib/api/server";

async function apiStatus(): Promise<{ online: boolean; message: string }> {
  try {
    const { data, response } = await getHealth({
      client: await serverClient(),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return response?.ok
      ? { online: true, message: data?.message ?? "OK" }
      : {
          online: false,
          message: response
            ? `API responded ${response.status}`
            : "API unreachable",
        };
  } catch {
    return { online: false, message: "API unreachable" };
  }
}

export default async function HomePage() {
  const status = await apiStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          aria-hidden
          className={`size-2 rounded-full ${
            status.online ? "bg-emerald-500" : "bg-destructive"
          }`}
        />
        API {status.online ? "online" : "offline"}: {status.message}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">cartspace</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        The storefront is on its way. Sign in or create an account in the
        meantime.
      </p>
    </div>
  );
}
