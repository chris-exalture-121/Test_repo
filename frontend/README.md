## Google Drive with Hardened Auth

####  See also: https://www.canva.com/design/DAGLLQyXFJc/rceyh2tmeHqGJBhT2RKUTQ/edit

## Running locally

The frontend code relies on `@canva-sdks/app-components`, an internal version of [@canva/app-components](https://www.npmjs.com/package/@canva/app-components).

First, check you can see [Canva App Components](https://github.com/canva-sdks/canva-app-components/pkgs/npm/app-components).
If you don't have access, ask someone in #ecosystem-partner-apps-integrations-public for access.

Once you have got access to the Git repo, you will need to set up a personal access token to pull the package into this repo.
Follow the instructions [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to get a token.

Once you have a token, add the token to your `~/.npmrc` file (create one if it doesn't exist)
from [these instructions](https://www.canva.com/design/DAGDezHiE00/mqNktbztWpbscs97pfPW-A/edit)
```
//npm.pkg.github.com/:_authToken=<your-token>
```

### Getting started

1. Copy `.env.example` to `.env` in the `app` directory.
1. Send new app id, oauth auth endpoint, oauth token url endpoint, app revocation endpoint to Canva so we can apply the changes to
   the app in the dev portal

#### Prepare the app.js

1. Navigate to `app` and run `npm run build`
1. You will find the app.js file at `app/dist/app.js`.
1. Upload the result to the portal

## Existing app

Go to the Canva Developer Portal and select the existing app (should be called SharePoint).
Note down the App ID of your existing app.
Upload the updated app/dist/app.js to App Source.
Test that the new version is working by using the Preview feature.

## New app

Note: a new app will require oauth credentials to be set up again. Please ping Canva channel to get your creds updated.

1. Go to [Canva Developer Portal](https://www.canva.com/developers/apps), and create a new app
1. Note down the App ID
1. Upload the new `app/dist/app.js` to `App Source`.
1. Test that the new version is working via `Preview`.
