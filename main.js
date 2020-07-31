const electron = require("electron");
const app= electron.app;
const ejs=require("ejs-electron");
ejs.data({
  "title":"My Excel",
  "rows":100,
  "cols":26
})

function createWindow()
{
    const win=new electron.BrowserWindow({
        width:800,
        height:600,
        show:false,
        webPreferences: {
            //to use node features int my electron window or app
            nodeIntegration: true
        }
    })
    //load the index.html file on my window
    win.loadFile('index.ejs').then(function() {
        // console.log("page loaded successfully");
        win.maximize();
        win.show();
        // Open the DevTools.    
        // win.webContents.openDevTools();
    });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })
app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

