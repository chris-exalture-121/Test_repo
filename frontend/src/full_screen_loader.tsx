import { Box, ProgressBar } from "@canva/app-ui-kit";
import * as React from "react";

export const FullScreenLoader = ({ progress }) => (
  <Box className="pt-[47vh] h-full flex flex-col justify-center">
    <ProgressBar value={progress} />
  </Box>
);
