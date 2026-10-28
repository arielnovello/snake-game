const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function createWindow() {
  const window = new BrowserWindow({
    width: 620,
    height: 780,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: "#4a752c",
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const gameURL = pathToFileURL(path.join(__dirname, "..", "index.html")).href;
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== gameURL) event.preventDefault();
  });
  window.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
