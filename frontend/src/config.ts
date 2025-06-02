import { Config } from '@canva-sdks/app-components';

const sortOptions = [
  { value: 'createdTime desc', label: 'Creation date (newest)' },
  { value: 'createdTime asc', label: 'Creation date (oldest)' },
  { value: 'name asc', label: 'Name (A-Z)' },
  { value: 'name desc', label: 'Name (Z-A)' },
  { value: 'modifiedTime desc', label: 'Update date (newest)' },
  { value: 'modifiedTime asc', label: 'Update date (oldest)' },
];

export const config = {
  serviceName: 'Google Drive',
  layouts: ['MASONRY', 'LIST'],
  resourceTypes: ['IMAGE', 'VIDEO', 'EMBED'],
  enableAppStatePersistence: true,
  moreInfoMessage:
    'At the moment, we only support images and videos. Corrupted or unsupported files will not appear',
  exit: {
    enabled: true,
    text: 'Select drive',
    // Placeholder - this is set in the function where this is called
    onExit: () => {},
  },
  sortOptions,
  export: {
    enabled: true,
    // acceptedFileTypes: ['jpg', 'png'],
    estimatedUploadTimeMs: 5000,
    containerTypes: ['folder'],
  },
  search: {
    enabled: true,
    filterFormConfig: {
      filters: [
        {
          key: 'imageType',
          label: 'Image Type',
          filterType: 'CHECKBOX',
          options: [
            {
              label: 'PNG',
              value: 'image/png',
            },
            {
              label: 'JPG',
              value: 'image/jpeg',
            },
            {
              label: 'GIF',
              value: 'image/gif',
            },
            {
              label: 'SVG',
              value: 'image/svg+xml',
            },
            {
              label: 'MP4',
              value: 'video/mp4',
            },
          ],
        },
      ],
    },
  },
  containerTypes: [
    {
      value: 'folder',
      label: 'Folders',
      listingSurfaces: [
        { surface: 'HOMEPAGE' },
        { surface: 'SEARCH' },
        {
          surface: 'CONTAINER',
          parentContainerTypes: ['folder'],
        },
      ],
      searchInsideContainer: {
        enabled: true,
      },
    },
  ],
} satisfies Config;
