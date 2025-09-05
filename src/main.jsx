import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
// import "./index.css";
import App from "./App.jsx";

// Polyfill Buffer before any Solana libs load
if (!window.Buffer) window.Buffer = Buffer;
createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>
);
