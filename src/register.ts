import React from "react";
import ReactDOM from "react-dom/client";
import reactToWebComponent from "react-to-webcomponent";
import MainApp from "./App";

// Registra como Web Component
const App = reactToWebComponent(MainApp, React, ReactDOM, {
  props: {
    logo_url: "string",
    authorization_endpoint: "string",
    environment: "string",
    development_endpoint: "string",
    api_key: "string",
    doctor_id: "string",
    clinic_id: "string",
  },
});
customElements.define("decoupled-agenda", App);
