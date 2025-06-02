interface SharePointDriveQueryResponse {
  value: SharePointSearchValue[];
  "@odata.context": string;
}

interface SharePointSearchValue {
  searchTerms: string[];
  hitsContainers: HitsContainer[];
}

interface HitsContainer {
  hits: Hit[];
  total: number;
  moreResultsAvailable: boolean;
}

interface Hit {
  hitId: string;
  rank: number;
  summary: string;
  resource: SharePointDriveResource;
}

interface SharePointDriveResource {
  "@odata.type": string;
  displayName: string;
  id: string;
  createdDateTime: string;
  description: string;
  lastModifiedDateTime: string;
  name: string;
  webUrl: string;
}
