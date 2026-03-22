import React from "react";
import ReactDOM from "react-dom/client";
import { POS } from "./components/pos/POS";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <POS />
  </React.StrictMode>
);
