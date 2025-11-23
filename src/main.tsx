import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CustomWindowsBar from "./componets/fileSystem/customWindowsBar";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CustomWindowsBar />
    <App />
  </React.StrictMode>,
);
