import React from "react";
import ReactDOM from "react-dom/client";
import { POS } from "./components/pos/POS";
import { BrowserRouter } from "react-router"; // Use the unified v7 router
import "./styles/index.css";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <POS />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  </React.StrictMode>
);
