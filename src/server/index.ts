import { createApp, hasBuiltFrontend } from './app.js';

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  const shop = hasBuiltFrontend ? `http://localhost:${port}` : 'http://localhost:5173';
  console.log(`Shop:     ${shop}`);
  console.log(`API docs: http://localhost:${port}/api/docs`);
});
