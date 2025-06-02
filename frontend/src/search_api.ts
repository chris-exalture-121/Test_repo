
// Get all folders in drive
export async function getAllFoldersInDrive(accessToken) {
  const foldersInDrive = {};
  let pageToken = null;
  const query =
    "trashed = false and mimeType = 'application/vnd.google-apps.folder'";

  do {
    const baseUrl = `https://www.googleapis.com/drive/v3/files`;
    const params = new URLSearchParams({
      pageSize: '1000',
      fields: 'nextPageToken, files(id, name, mimeType, parents)',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      q: query,
      pageToken: pageToken || '',
    });

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    const folders = data.files || [];
    pageToken = data.nextPageToken;

    folders.forEach((folder) => {
      foldersInDrive[folder.id] = folder.parents ? folder.parents[0] : null;
    });
  } while (pageToken);

  return foldersInDrive;
}
// Recursively get subfolders
export function getSubfoldersOfFolder(folderId, allFolders) {
  const subfolders = Object.keys(allFolders).filter(
    (key) => allFolders[key] === folderId
  );
  let allSubfolders = [...subfolders];

  subfolders.forEach((subFolderId) => {
    allSubfolders = allSubfolders.concat(
      getSubfoldersOfFolder(subFolderId, allFolders)
    );
  });

  return allSubfolders;
}

export async function getGoogleDriveSubFolders({ accessToken, folderId }) {
  try {
    const allFolders = await getAllFoldersInDrive(accessToken);
    let relevantFolders = [folderId];
    const subfolders = getSubfoldersOfFolder(folderId, allFolders);

    relevantFolders = relevantFolders.concat(subfolders);

    return relevantFolders;
  } catch (error: any) {
    console.error('Error fetching folders or files:', error?.message);
  }
}
