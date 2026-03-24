import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserLibraryFiles } from "@/services/backend-services/library-service";
import { LibraryDashboard } from "@/components/custom/library-dashboard";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const files = await getUserLibraryFiles(session.user.id);

  const serialized = files.map((f) => ({
    id: f.id,
    fileKey: f.fileKey,
    fileUrl: f.fileUrl,
    fileName: f.fileName,
    sourceType: f.sourceType,
    createdAt: f.createdAt.toISOString(),
  }));

  return <LibraryDashboard initialFiles={serialized} />;
}
