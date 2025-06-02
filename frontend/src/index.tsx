import "@canva/app-ui-kit/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import styles from "./index.css";

import { App } from "./app";
import { AppUiProvider } from "@canva/app-ui-kit";
import ErrorBoundary from "./error_boundary";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <div className={styles.rootWrapper}>
    <AppUiProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppUiProvider>
  </div>
);
