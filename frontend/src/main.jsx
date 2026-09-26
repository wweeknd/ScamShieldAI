import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DemoModeProvider } from "./context/DemoMode";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DemoModeProvider>
        <App />
      </DemoModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
