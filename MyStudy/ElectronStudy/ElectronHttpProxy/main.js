const { app, BrowserWindow } = require('electron');
const { session } = require('electron')
let mainWindow;
app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    mainWindow = new BrowserWindow({ width: 1024, height: 768 });
    proxyConfig  = {
        proxyRules:"socks5://134.175.38.75:1080",
        proxyBypassRules:"127.0.0.1,www.baidu.com"
    };
    mainWindow.webContents.session.setProxy(proxyConfig, function () { mainWindow.loadURL('https://www.google.com'); });
    mainWindow.openDevTools();
});