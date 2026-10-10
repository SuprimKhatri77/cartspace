export function SiteFooter() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground">
        <span>cartspace</span>
        {apiUrl && (
          <a
            className="underline-offset-4 hover:underline"
            href={`${apiUrl}/api/v1/docs/`}
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        )}
      </div>
    </footer>
  );
}
