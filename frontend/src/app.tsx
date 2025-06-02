import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { config } from './config';
import { find } from './adapter';
import {
  Box,
  Rows,
  Select,
  Title,
  ProgressBar,
  Button,
  Text,
  Avatar,
  LoadingIndicator,
} from "@canva/app-ui-kit";
import { SearchableListView } from "@canva-sdks/app-components";
import { createUrlShortcut, uploadFileToGoogleDrive } from "./google_drive.api";
import { getAccessToken, googleDriveScopes } from "./auth";
import ShortUniqueId from "short-unique-id";
import {
  getExtensionFromURL,
  getMimeTypeFromExtension,
} from "./util/file_extension.util";
import GoogleDriveLogo from "./images/google_drive_logo.png";
import { getDesignToken } from "@canva/design";
import { unverifiedJwtDecode } from "./util/design.util";
import { auth } from "@canva/user";

const drives = [
  {
    label: 'My Drive',
    value: 'my-drive',
    icon: () => (
      <img
        src={GoogleDriveLogo}
        className='w-9 h-9 mr-2'
        style={{ width: '2.25rem', height: '2.25rem', marginRight: '.5rem' }}
      />
    ),
  },
  {
    label: 'Shared Drive',
    value: 'shared-drive',
    icon: () => (
      <img
        src={GoogleDriveLogo}
        className='w-9 h-9 mr-2'
        style={{ width: '2.25rem', height: '2.25rem', marginRight: '.5rem' }}
      />
    ),
  },
];

const DrivesList = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve the last visited drive from localStorage and navigate to it if available
    const lastDriveId = localStorage.getItem('lastDriveId');
    if (lastDriveId) navigate(`/drive/${lastDriveId}`);
  }, [navigate]);

  const handleDriveChange = (value) => {
    localStorage.setItem('lastDriveId', value);
    navigate(`/drive/${value}`);
  };

  return (
    <Box paddingEnd='2u'>
      <Box paddingTop='2u'>
        <Rows spacing='1u'>
          <Title size='xsmall'>Connect or select a drive</Title>
          <Box paddingTop='1u'>
            <Rows spacing='1u'>
              {drives?.map((drive) => (
                <div
                  key={drive.value}
                  onClick={() => handleDriveChange(drive.value)}
                  className='flex cursor-pointer items-center'
                >
                  <Button variant='tertiary' icon={drive.icon}>
                    {drive.label}
                  </Button>
                </div>
              ))}
            </Rows>
          </Box>
        </Rows>
      </Box>
    </Box>
  );
};

const DriveDetail = ({
  onUnauthorizedError: onUnauthorizedError,
}: {
  onUnauthorizedError: () => void;
}) => {
  let { driveId } = useParams();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);

  return (
    <SearchableListView
      config={{
        ...config,
        exit: {
          ...config.exit,
          onExit: () => {
            // TODO: move this into a hook
            // Don't forget to test export if you do!
            localStorage.setItem("lastDriveId", "");
            navigate("/");
          },
        },
        currentDrive: driveId === "shared-drive" ? "shared-drive" : "my-drive",
        serviceName: urlParams.get("driveName") || "Google Drive",
        // Allow user to save to root folder if they are in "My Drive", but require a folder to be selected in "Shared Drive"
        export: {...config.export, requireContainerSelected: driveId === "shared-drive"},
      }}
      findResources={(req) =>
        find(
          {
            ...req,
            corpora: driveId === "my-drive" ? "user" : "allDrives",
          },
          onUnauthorizedError
        )
      }
      saveExportedDesign={async (
        exportedDesignUrl: string,
        containerId?: string,
        designTitle?: string
      ) => {
        try {
          let accessToken = await getAccessToken();

          if (!accessToken) {
            onUnauthorizedError()
            return Promise.resolve({success: false})
          }

          const uid = new ShortUniqueId({ length: 7 });

          const id = uid.rnd();
          const extension = getExtensionFromURL(exportedDesignUrl);
          await uploadFileToGoogleDrive({
            accessToken,
            fileUrl: exportedDesignUrl,
            fileName: designTitle
              ? `${designTitle}.${extension}`
              : `Canva Export - ${id}.${extension}`,
            mimeType: getMimeTypeFromExtension(exportedDesignUrl),
            folderId: containerId,
          });

          return { success: true };
        } catch (err) {
          console.error(err);
          return { success: false };
        }
      }}
      saveShortcutDesign={async (designToken: string, containerId?: string) => {  
        try {
          let accessToken = await getAccessToken();

          if (!accessToken) {
            onUnauthorizedError()
            return Promise.resolve({success: false})
          }
          const designId = unverifiedJwtDecode(designToken)?.payload?.designId;
          await createUrlShortcut({
            designId,
            shortcutName: `${designId}`,
            parentFolderId: containerId,
          }, accessToken);
          return { success: true };
        } catch (err) {
          console.error(err);
          return { success: false };
        }
      }}
      // Turn on to get logs for SLV
      logLevel={process.env.NODE_ENV === "development" ? "debug" : "error"}
    />
  );
};

export const App = () => {
  // initialize the OAuth client
  const oauth = useMemo(() => auth.initOauth(), []);

  const [isAuthorized, setIsAuthorized] = useState<boolean>();
  const [invalidAccessToken, setInvalidAccessToken] = useState<boolean>();
  const [authorizationError, setAuthorizationError] = useState<string>();

  useEffect(() => {
    if (invalidAccessToken) {
      setIsAuthorized(false)
      authorizeUser({invalidAccessToken})
      return
    }
    // check if the user is already authorized, if not authorize user
    authorizeUser({});
  }, [oauth, invalidAccessToken]);

  const authorizeUser = useCallback(
    async ({forceRefresh = false, invalidAccessToken = false}: {forceRefresh?: boolean, invalidAccessToken?: boolean}) => {
      try {
        const accessTokenFound = !invalidAccessToken && !!(
          await oauth.getAccessToken({
            forceRefresh,
            scope: new Set(googleDriveScopes),
          })
        )?.token;

        if (accessTokenFound) {
          setIsAuthorized(true);
          return;
        }

        await oauth.requestAuthorization({
          scope: new Set(googleDriveScopes),
          // Google does not offer a refresh token by default,
          // To enable refresh token we need to set access_type=offline: https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
          queryParams: { access_type: "offline" },
        });
        // Recursively check if user is authorized, if not request authorization
        authorizeUser({});
        return;
      } catch (error) {
        setAuthorizationError(
          error instanceof Error
            ? error.message
            : "Something went wrong on our end, please refresh the web page and try again. If this issue persists please contact us."
        );
      }
    },
    [isAuthorized, oauth]
  );

  if (!isAuthorized) {
    return (
      <Box
        justifyContent="center"
        width="full"
        alignItems="center"
        display="flex"
        height="full"
      >
        {authorizationError ? (
          <Rows spacing="1u">
            <Title>Authorization error</Title>
            <Text>{authorizationError}</Text>
            <Button
              variant="primary"
              onClick={() => {
                setAuthorizationError(undefined)
                authorizeUser({ forceRefresh: true, invalidAccessToken: true });
              }}
            >
              Try again
            </Button>
          </Rows>
        ) : (
          <LoadingIndicator />
        )}
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/drive/:driveId"
          element={
            <DriveDetail
              onUnauthorizedError={async () => {
                setInvalidAccessToken(true);
              }}
            />
          }
        />
        <Route path="*" element={<DrivesList />} />
      </Routes>
    </Router>
  );
};
