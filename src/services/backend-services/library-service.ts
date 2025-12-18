import prisma from "@/lib/prisma";

export async function recordLibraryFile(userId: string, fileKey: string, fileUrl: string, fileName: string) {
  if (!userId || !fileKey || !fileUrl) {
    throw new Error("userId, fileKey, and fileUrl are required to record library file.");
  }

  return prisma.libraryFile.create({
    data: {
      userId,
      fileKey,
      fileUrl,
      fileName,
    },
  });
}

export async function getUserLibraryFiles(userId: string) {
  if (!userId) {
    throw new Error("userId is required to fetch library files.");
  }

  return prisma.libraryFile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileKey: true,
      fileUrl: true,
      fileName: true,
      createdAt: true,
    },
  });
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
