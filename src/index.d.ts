import { AppProps } from "./App";

// src/index.d.ts
declare module "agenda-desacoplada" {
  const app: React.FC<AppProps>;
  export default app;
}
