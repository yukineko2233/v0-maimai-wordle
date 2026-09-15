import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { ConfirmProvider } from "./components/common/ConfirmProvider"
import "./styles/globals.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </React.StrictMode>,
)
