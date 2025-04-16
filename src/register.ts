import React from "react";
import ReactDOM from "react-dom/client";
import reactToWebComponent from "react-to-webcomponent";
import MainApp from "./App";

// Registra como Web Component
const App = reactToWebComponent(MainApp, React, ReactDOM);
customElements.define("decoupled-agenda", App);
