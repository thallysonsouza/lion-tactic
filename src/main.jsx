import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

import App from "./App";

import "./styles/theme.css";
import "./index.css";
import "./styles/mobile.css";

ReactDOM.createRoot(document.getElementById("root")).render(

    <React.StrictMode>

        <BrowserRouter>

            <AuthProvider>

                <ToastProvider>

                    <App/>

                </ToastProvider>

            </AuthProvider>

        </BrowserRouter>

    </React.StrictMode>

);