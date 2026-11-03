const { app, BrowserWindow, screen } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function createWindow() {
  const area = screen.getPrimaryDisplay().workAreaSize;
  const window = new BrowserWindow({
    width: Math.min(1040, area.width - 24),
    height: Math.min(960, area.height - 24),
    minWidth: Math.min(840, area.width - 24),
    minHeight: Math.min(640, area.height - 24),
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
