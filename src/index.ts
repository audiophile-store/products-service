import { createApp } from "./app.js";
import { pool } from "./db.js";

const app = createApp(pool);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`products service listening on port ${PORT}`);
});
