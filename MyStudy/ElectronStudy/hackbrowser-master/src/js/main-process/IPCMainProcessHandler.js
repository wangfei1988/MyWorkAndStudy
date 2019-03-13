const path = require('path')
const navigationHistoryHandler = require(path.join(global.__app.srcPath, 'js', 'main-process', 'model', 'NavigationHistory'))

/**
 * handles all IPC communication with the renderer processes (browser windows)
 *
 * @param mainProcessController
 * @constructor
 */
function IPCMainProcessHandler(mainProcessController) {
	const ipcMain = require('electron').ipcMain

	let _this = this
	let windowManager

	/* ====================================
	 private methods
	 ===================================== */
	let init = function() {
		windowManager = mainProcessController.getWindowManager()

		attachEventHandlers()
	}

	let attachEventHandlers = function() {
		ipcMain.on('newWindowOpenRequest', handleNewWindowOpenRequest)
		ipcMain.on('addNavigationHistoryRequest', handleAddNavigationHistoryRequest)
		ipcMain.on('autoCompleteEntriesRequest', handleAutoCompleteEntriesRequest)

		//最大 最小 隐藏
        ipcMain.on('min', e=> global.__app.mainwindow.minimize());
        ipcMain.on('max', e=> {
            if (global.__app.mainwindow.isMaximized()) {
                global.__app.mainwindow.unmaximize()
            } else {
                global.__app.mainwindow.maximize()
            }
        });
        ipcMain.on('close', e=> global.__app.mainwindow.close());
	}

	let handleNewWindowOpenRequest = function(event, url) {
		windowManager.openNewWindow(url)

		event.sender.send('newWindowOpenResponse', true)
	}
	
	let handleAddNavigationHistoryRequest = function(event, navigationInfo) {
		navigationInfo = JSON.parse(navigationInfo)

		navigationHistoryHandler.addNavigationHistory(navigationInfo, function(err) {
			if (err) {
				event.sender.send('newNavigationHistoryResponse', false)
			} else {
				event.sender.send('newNavigationHistoryResponse', true)
			}
		})
	}

	let handleAutoCompleteEntriesRequest = function(event, searchTerm) {
		navigationHistoryHandler.getAutoCompleteList(searchTerm, function(autoCompleteEntries) {
			event.sender.send('autoCompleteEntriesResponse', JSON.stringify(autoCompleteEntries))
		})
	}

	init()
}

module.exports = IPCMainProcessHandler