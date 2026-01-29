import { PORT } from "./src/config.js";
import { createApp } from "./src/app.js";

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`page-metadata-service listening on http://localhost:${PORT}`);
});
