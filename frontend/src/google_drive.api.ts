import { debounce, throttle } from "lodash";
import { getAccessToken } from "./auth";
import { getGoogleDriveSubFolders } from "./search_api";

interface GoogleDriveSearchParams {
  accessToken: string;
  folderId?: string;
  searchQuery?: string;
  limit: number;
  filters: {
    mimeTypes?: string[];
  };
  continuation?: string;
  corpora?: "user" | "allDrives";
  itemType: "files" | "folders" | "all";
  orderBy: string;
}

// TODO: get this working. Seems to break SLV.
const THROTTLE_IN_MILLIS = 0;

export const fetchGoogleDriveData = throttle(
  async (
    {
      accessToken,
      folderId,
      searchQuery,
      limit,
      filters,
      continuation,
      corpora,
      itemType,
      orderBy,
    }: GoogleDriveSearchParams,
    onUnauthorizedError: () => void
  ) => {
    const baseUrl = `https://www.googleapis.com/drive/v3/files`;
    const fields =
      "nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, videoMediaMetadata,imageMediaMetadata,createdTime,modifiedTime,size)";

    // Construct the MIME type query based on the itemType
    let mimeTypeQuery = "";
    if (filters?.mimeTypes) {
      mimeTypeQuery += `(${filters?.mimeTypes
        .map((mt) => `mimeType='${mt}'`)
        .join(" or ")})`;
    } else {
      switch (itemType) {
        case "files":
          mimeTypeQuery =
            "mimeType!='application/vnd.google-apps.folder' and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp' or mimeType='image/svg+xml' or mimeType='image/heic' or mimeType='image/heif' or mimeType='image/tiff' or mimeType='image/gif' or mimeType='video/mp4' or mimeType='video/avi' or mimeType='video/x-m4v' or mimeType='video/x-matroska' or mimeType='video/quicktime' or mimeType='video/mpeg' or mimeType='video/webm')";
          break;
        case "folders":
          if (!searchQuery && !folderId) {
            mimeTypeQuery = "mimeType='application/vnd.google-apps.folder'";
          } else {
            mimeTypeQuery = "(mimeType='application/vnd.google-apps.folder')";
          }
          break;
        case "all":
          // Folder hierarchy maintained
          if (!searchQuery && !folderId) {
            mimeTypeQuery =
              "((mimeType='application/vnd.google-apps.folder') or mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp' or mimeType='image/svg+xml' or mimeType='image/heic' or mimeType='image/heif' or mimeType='image/tiff' or mimeType='image/gif' or mimeType='video/mp4' or mimeType='video/avi' or mimeType='video/x-m4v' or mimeType='video/x-matroska' or mimeType='video/quicktime' or mimeType='video/mpeg' or mimeType='video/webm')";
          } else {
            mimeTypeQuery =
              "((mimeType='application/vnd.google-apps.folder' or mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp' or mimeType='image/svg+xml' or mimeType='image/heic' or mimeType='image/heif' or mimeType='image/tiff' or mimeType='image/gif' or mimeType='video/mp4' or mimeType='video/avi' or mimeType='video/x-m4v' or mimeType='video/x-matroska' or mimeType='video/quicktime' or mimeType='video/mpeg' or mimeType='video/webm')";
          }
          break;
      }
    }

    let query = `${mimeTypeQuery} and trashed=false`;
    if (folderId) {
      if (
        searchQuery ||
        (filters?.mimeTypes && filters?.mimeTypes?.length > 0)
      ) {
        let folderList = await getGoogleDriveSubFolders({
          accessToken,
          folderId,
        });
        const folderChunks = chunkArray(folderList, 500);
        for (const chunk of folderChunks) {
          query = `(${chunk
            ?.map((folderId) => `'${folderId}' in parents`)
            ?.join(" or ")}) and ${query}`;
        }
      } else {
        query = `('${folderId}' in parents) and ${query}`;
      }
    } else if (
      searchQuery ||
      (filters?.mimeTypes && filters?.mimeTypes?.length > 0)
    ) {
      if (corpora === "user") {
        query = `('me' in owners) and ${query}`;
      } else if (corpora === "allDrives") {
        query = `(not 'me' in owners) and ${query}`;
      }
    } else {
      if (corpora === "user") {
        query = `('root' in parents) and ${query}`;
      } else if (corpora === "allDrives") {
        query = `(sharedWithMe=true) and ${query}`;
      }
    }
    if (searchQuery) {
      searchQuery = String(searchQuery).replace(/[\\'"]/g, "");
      query += ` and (name contains '${searchQuery}')`;
    }

    const params = new URLSearchParams({
      pageSize: limit.toString(),
      fields: fields,
      q: query,
    });
    if (orderBy) {
      params.set("orderBy", orderBy);
    }
    if (continuation) {
      params.set("pageToken", continuation);
    }
    if (corpora) {
      params.set("corpora", corpora);
      if (corpora === "allDrives") {
        params.set("includeItemsFromAllDrives", "true");
        params.set("supportsAllDrives", "true");
      }
    }

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        method: "GET",
        headers: headers,
        redirect: "follow",
      });

      if (response.ok) {
        const result = await response.json();
        return {
          type: "SUCCESS",
          items: result.files,
          continuation: result.nextPageToken,
        };
      }

      if (response.status === 401) {
        onUnauthorizedError();
        return {
          type: "ERROR",
          errorCode: "UNAUTHORIZED",
        };
      }
      return {
        type: "ERROR",
        errorCode: "INTERNAL_ERROR",
      };
    } catch (error) {
      console.error("No data found.", error);
      return { type: "ERROR", errorCode: "INTERNAL_ERROR" };
    }
  },
  THROTTLE_IN_MILLIS
);

/**
 * Export Canva design to Google Drive
 */
export async function uploadFileToGoogleDrive({
  folderId = "root",
  accessToken,
  fileUrl,
  fileName,
  mimeType,
}: {
  folderId?: string;
  accessToken: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}): Promise<any> {
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    console.error("Failed to download file from URL:", fileUrl);
    return null;
  }
  const file = await fileResponse.blob();

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const requestOptions = {
    method: "POST",
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: form,
  };

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    requestOptions
  );
  const result = await response.json();
  if (response.ok) {
    console.log("File uploaded successfully");
    return result;
  } else {
    throw new Error(result);
  }
}

export async function createUrlShortcut(
  params: {
    designId: string;
    shortcutName: string;
    parentFolderId?: string;
  },
  accessToken: string
): Promise<void> {
  const url = "https://www.googleapis.com/drive/v3/files";

  const shortcutMetadata = {
    name: `Canva Shortcut - ${params.shortcutName}`,
    mimeType: "application/vnd.google-apps.drive-sdk",
    appProperties: {
      canvaId: params.designId,
    },
    parents: [params.parentFolderId],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shortcutMetadata),
  });

  // Parse the response
  const data = await response.json();

  console.log(data);

  if (!response.ok) {
    throw new Error(`Error creating URL shortcut: ${response.statusText}`);
  }

  return;
}

function chunkArray(arr, chunkSize) {
  let chunkedArray = [] as any;
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunkedArray.push(arr.slice(i, i + chunkSize));
  }
  return chunkedArray;
}
