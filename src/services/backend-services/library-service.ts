import prisma from "@/lib/prisma";
import { deleteBlobByUrl } from "@/services/backend-services/blob-service";

export async function recordLibraryFile(userId: string, fileKey: string, fileUrl: string, fileName: string, sourceType = "upload") {
  if (!userId || !fileKey || !fileUrl) {
    throw new Error("userId, fileKey, and fileUrl are required to record library file.");
  }

  return prisma.libraryFile.create({
    data: {
      userId,
      fileKey,
      fileUrl,
      fileName,
      sourceType,
    },
  });
}

export async function getUserLibraryFiles(userId: string, sourceType?: string) {
  if (!userId) {
    throw new Error("userId is required to fetch library files.");
  }

  return prisma.libraryFile.findMany({
    where: { userId, ...(sourceType ? { sourceType } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileKey: true,
      fileUrl: true,
      fileName: true,
      sourceType: true,
      createdAt: true,
    },
  });
}

export async function renameLibraryFile(userId: string, fileId: string, fileName: string) {
  if (!userId || !fileId || !fileName?.trim()) {
    throw new Error("userId, fileId, and fileName are required to rename a file.");
  }

  const file = await prisma.libraryFile.findFirst({
    where: { id: fileId, userId },
    select: { id: true },
  });

  if (!file) {
    throw new Error("File not found.");
  }

  return prisma.libraryFile.update({
    where: { id: fileId },
    data: { fileName: fileName.trim() },
  });
}

export async function deleteLibraryFile(userId: string, fileId: string) {
  if (!userId || !fileId) {
    throw new Error("userId and fileId are required to delete a file.");
  }

  const file = await prisma.libraryFile.findFirst({
    where: { id: fileId, userId },
    select: { id: true, fileUrl: true },
  });

  if (!file) {
    throw new Error("File not found.");
  }

  // Delete reader progress, then the file record
  await prisma.readerProgress.deleteMany({ where: { fileId } });
  await prisma.libraryFile.delete({ where: { id: fileId } });

  // Clean up blob storage (best effort)
  if (file.fileUrl) {
    try {
      await deleteBlobByUrl(file.fileUrl);
    } catch {
      // Blob deletion is best-effort; the DB record is already gone
    }
  }
}

export async function saveReaderProgress(params: {
  userId: string;
  fileId: string;
  blockId: string;
  offset: number;
}) {
  const { userId, fileId, blockId, offset } = params;
  if (!userId || !fileId || !blockId || offset === undefined || offset === null) {
    throw new Error("userId, fileId, blockId, and offset are required to save progress.");
  }

  return prisma.readerProgress.create({
    data: {
      userId,
      fileId,
      blockId,
      offset,
    },
  });
}

export async function getReaderProgress(userId: string, fileId: string) {
  if (!userId || !fileId) {
    throw new Error("userId and fileId are required to fetch progress.");
  }

  return prisma.readerProgress.findFirst({
    where: { userId, fileId },
    orderBy: { 'updatedAt': 'desc' }
  });
}
