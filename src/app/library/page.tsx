import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { getUserLibraryFiles } from "@/services/backend-services/library-service";

export const dynamic = "force-dynamic";

function truncateName(name: string, max = 40) {
  if (name.length <= max) return name;
  const half = Math.floor((max - 3) / 2);
  return `${name.slice(0, half)}...${name.slice(-half)}`;
}

export default async function LibraryDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Library</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Please sign in to view your library.</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const files = await getUserLibraryFiles(session.user.id);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
            <p className="text-sm text-muted-foreground">Saved files from your uploads.</p>
          </div>
          <Button asChild>
            <Link href="/library/extract">Upload new</Link>
          </Button>
        </div>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Your files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files yet. Upload one to get started.</p>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/60">
                {files.map((file) => (
                  <div key={file.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{truncateName(file.fileName || "Untitled")}</p>
                      <p className="text-xs text-muted-foreground">{file.fileKey}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(file.createdAt), "PPpp")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
