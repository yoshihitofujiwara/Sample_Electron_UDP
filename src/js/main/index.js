import fs from "fs";
import cheerio from "cheerio";
import electron from "electron";
import dgram from "dgram";


/*--------------------------------------------------------------------------
	config
--------------------------------------------------------------------------*/
let window = null;

// UDP送信先のIPとPORT
let udpClient = null;
let clientIP = null;
let clientPort = null;

// UDP受信PORT
let udpServer = null;
let serverPort = null;


// init call
load(setup);



/*--------------------------------------------------------------------------
	@load 設定ファイルの読込
--------------------------------------------------------------------------*/
function load(callback) {
	// SettingFile
	let file = electron.app.getAppPath("Resources") + "/settings.xml";

	fs.readFile(file, (err, data) => {
		if (err) {
			console.log(err);
		} else {
			let $ = cheerio.load(data);
			let $settings = $("settings");

			clientIP = $settings.children("clientIP").text();
			clientPort = $settings.children("clientPort").text();
			serverPort = $settings.children("serverPort").text();
		}
		if (typeof callback == "function") callback();
	});
}



/*--------------------------------------------------------------------------
	@setup アプリのセットアップ
--------------------------------------------------------------------------*/
function setup(){
	//  初期化が完了した時の処理
	electron.app.on("ready", () =>{
		openWindow();
	});

	// 全てのウィンドウが閉じたときの処理
	electron.app.on("window-all-closed", () => {
		// macOSのとき以外はアプリケーションを終了させます
		if (process.platform !== "darwin") {
			closeWindow();
		}
	});

	// アプリケーションがアクティブになった時の処理(Macだと、Dockがクリックされた時）
	electron.app.on("activate", () => {
		// ウィンドウが消えている場合は再度ウィンドウを作成する
		if (window === null) {
			openWindow();
		}
	});

	openWindow();
}


/*--------------------------------------------------------------------------
	@openWindow アプリ起動
--------------------------------------------------------------------------*/
function openWindow() {
	if (window != null) closeWindow();

	// ウィンドウ生成
	window = new electron.BrowserWindow({
		width: 1280,
		height: 700
	});

	// ウィンドウに表示するURLを指定
	window.loadFile("index.html");

	// デベロッパーツールの起動
	window.webContents.openDevTools();

	// ウィンドウが閉じられたときの処理
	window.on("closed", () => {
		closeWindow();
	});

	// アプリを落とすショートカット ctr + q
	electron.globalShortcut.register("ctrl+q", () => {
		closeWindow();
	});


	// create udp
	createServer();
	createClient();
};


/*--------------------------------------------------------------------------
	@closeWindow アプリ終了
--------------------------------------------------------------------------*/
function closeWindow() {
	if (udpServer) udpServer.close();
	if (udpClient) udpClient.close();

	electron.session.defaultSession.clearCache(() => { })

	if (process.platform !== "darwin") {
		window.close();
		window = null;
	}

	electron.app.quit();
}


/*--------------------------------------------------------------------------
	@createServer UDPサーバー生成（受信側）
--------------------------------------------------------------------------*/
function createServer() {
	udpServer = dgram.createSocket("udp4");

	// # OSC受信
	// レンダープロセスからIPC通信を受け取る
	electron.ipcMain.on("renderer", (ipcRenderer, param) => {
		// IPC通信疎通確認
		ipcRenderer.sender.send("server", "========== Settings ==========");
		ipcRenderer.sender.send("server", "SettingFilePath: " + electron.app.getAppPath("Resources") + "/settings.xml");
		ipcRenderer.sender.send("server", "clientIP: " + clientIP);
		ipcRenderer.sender.send("server", "clientPort: " + clientPort);
		ipcRenderer.sender.send("server", "serverPort: " + serverPort);
		ipcRenderer.sender.send("server", "===========================");


		// メッセージを受信した時の処理
		udpServer.on("message", (msg, rinfo) => {
			let message = msg.toString("utf-8", 0, msg.length);
			ipcRenderer.sender.send("server", message);
		});

		// 受信可能になった時
		udpServer.on("listening", () => {
			let address = udpServer.address();
			console.log("server listening " + address.address + ":" + address.port);
		});

		// 受信でエラーがあった時
		udpServer.on("error", (err) => {
			console.log("server error: \n" + err.stack);
			udpServer.close();
		});

		// Socket がクローズした時
		udpServer.on("close", () => {
			console.log("closed");
		});

		// 受信開始
		udpServer.bind(serverPort);
	});
}


/*--------------------------------------------------------------------------
	@createClient UDP送信
--------------------------------------------------------------------------*/
function createClient() {
	udpClient = dgram.createSocket("udp4");

	electron.ipcMain.on("client", (_ipcRenderer, param) => {
		let message = Buffer.from(param, "utf8");

		// メッセージ送信
		udpClient.send(message, 0, message.length, clientPort, clientIP, (err, bytes) => {
			// console.log("sent.");
		});
	});

	// // サーバからメッセージ受信したときの処理
	// client.on("message", function (msg, rinfo) {
	// 	console.log("recieved: " + msg.toString("hex"));
	// 	client.close();
	// });

	// // メッセージ送信でエラーが起きた時の処理
	// client.on("err", function (err) {
	// 	console.log("client error: \n" + err.stack);
	// 	console.close();
	// });

	// // Socket をクローズした時の処理
	// client.on("close", function () {
	// 	console.log("closed.");
	// });
}
