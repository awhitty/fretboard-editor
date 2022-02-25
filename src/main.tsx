import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { globalCss } from "./stitches.config";

globalCss({
  "html, body, #root": {
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    fontFamily: "system-ui",
  },
})();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
