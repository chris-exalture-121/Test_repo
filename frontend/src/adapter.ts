import {
  Resource,
  FindResourcesResponse,
  FindResourcesRequest,
  Image,
  Container,
  Video,
} from "@canva-sdks/app-components";
import { fetchGoogleDriveData } from "./google_drive.api";
import { auth } from "@canva/user";
import { getAccessToken } from "./auth";

// TODO: use a custom domain name here and refactor
const proxyUrl = "https://google-drive.canva-apps.com";

const imageMimeValues = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/tiff",
];

const videoMimeValues = [
  "video/mp4",
  "video/avi",
  "video/x-m4v",
  "video/x-matroska",
  "video/quicktime",
  "video/mpeg",
  "video/webm",
  "image/gif",
];

export async function find(
  request: FindResourcesRequest & { corpora?: string },
  onUnauthorizedError: () => void
): Promise<FindResourcesResponse> {
  const accessToken = await getAccessToken();
  let resources: Resource[] = [];
  if (!accessToken) {
    onUnauthorizedError();
    return {
      type: "ERROR",
      errorCode: "FORBIDDEN",
    };
  }

  let isFolderOnly =
    request.containerTypes?.includes("folder") &&
    request.containerTypes?.length === 1;

  const { type, items, continuation, errorCode } = await fetchGoogleDriveData(
    {
      searchQuery: request.query!,
      corpora: request.corpora as "user" | "allDrives",
      accessToken: accessToken,
      folderId: request.containerId,
      limit: request.limit,
      filters: {
        mimeTypes: request.filters?.selectedOptions?.imageType?.selected,
      },
      continuation: request.continuation,
      itemType:
        request.containerTypes?.length === 2
          ? "all"
          : isFolderOnly
          ? "folders"
          : "files",
      orderBy: request.sort,
    },
    onUnauthorizedError
  );
  if (type !== "SUCCESS") {
    return {
      type: "ERROR",
      errorCode,
    };
  }
  if (items) {
    for (let datum of items ?? []) {
      const getUrlFunction = async () => {
        const canvaUserToken = await auth.getCanvaUserToken();
        const response = await (
          await fetch(`${proxyUrl}/generate-url`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${canvaUserToken}`,
              "X-Forward-Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileId: datum.id }),
          })
        ).json();

        return response.presignedUrl;
      };
      if (imageMimeValues.includes(datum.mimeType)) {
        resources.push({
          id: datum.id,
          mimeType:
            datum.mimeType === "image/heif" ? "image/heic" : datum.mimeType,
          name: datum.name,
          filename: datum.name,
          fileSizeKB: getFileSizeInKB(datum.size),
          downloadUrl: datum.webViewLink,
          createdAt: datum.createdTime,
          updatedAt: datum.modifiedTime,
          width:
            datum.imageMediaMetadata.rotation === 1 ||
            datum.imageMediaMetadata.rotation === 3
              ? datum.imageMediaMetadata?.height
              : datum.imageMediaMetadata?.width,
          height:
            datum.imageMediaMetadata.rotation === 1 ||
            datum.imageMediaMetadata.rotation === 3
              ? datum.imageMediaMetadata?.width
              : datum.imageMediaMetadata?.height,
          thumbnail: {
            url: datum.thumbnailLink,
          },
          type: "IMAGE",
          getUrl: getUrlFunction,
          description: datum.description,
        } satisfies Image);
      }
      if (videoMimeValues.includes(datum.mimeType)) {
        const encodedFileUrl = encodeURIComponent(
          `https://www.googleapis.com/drive/v3/files/${datum.id}?alt=media`
        );

        resources.push({
          id: datum.id,
          mimeType: datum.mimeType,
          name: datum.name,
          filename: datum.name,
          fileSizeKB: getFileSizeInKB(datum.size),
          downloadUrl: datum.webViewLink,
          createdAt: datum.createdTime,
          updatedAt: datum.modifiedTime,
          thumbnail: {
            url: datum.thumbnailLink,
          },
          width:
            datum.mimeType !== "image/gif"
              ? datum.videoMediaMetadata?.width
              : datum.imageMediaMetadata?.width,
          height:
            datum.mimeType !== "image/gif"
              ? datum.videoMediaMetadata?.height
              : datum.imageMediaMetadata?.height,
          durationMs: datum?.videoMediaMetadata?.durationMillis, // We don't get duration unfortunately
          type: "VIDEO",
          getUrl: getUrlFunction,
          description: datum.description,
        } satisfies Video);
      }
      if (["application/vnd.google-apps.folder"].includes(datum.mimeType)) {
        resources.push({
          containerType: "folder",
          id: datum.id,
          name: datum.name,
          type: "CONTAINER",
          description: datum.description,
        } satisfies Container);
      }
    }
  }
  return {
    type: "SUCCESS",
    resources,
    continuation: continuation,
  };
}

/**
 * 
 * @param size string (int64 format) provided by Google Drive API. Size in bytes of blobs and first party editor files. https://developers.google.com/drive/api/reference/rest/v3/files#File
 * @returns fileSizeInKB
 */
const getFileSizeInKB = (size: string): number | undefined=> {
    const sizeInBytes = parseInt(size, 10);

    // Validate the parsed value to ensure it's a valid number
    if (isNaN(sizeInBytes) || sizeInBytes < 0) {
        return undefined
    }

    // Convert bytes to kilobytes
    const sizeInKB = sizeInBytes / 1024;
    
    return sizeInKB;
}