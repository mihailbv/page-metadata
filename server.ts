import { PORT } from "#config";
import { createApp } from "#app";

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`page-metadata-service listening on http://localhost:${PORT}`);
});
