import React from "react";
import './index.css';  // ← Make sure this line exists
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRoutes from "./app/routes";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);