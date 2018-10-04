import { ipcRenderer } from "electron";
import $ from "jquery";


// WARNING
// live reload
// import electronConnect from "electron-connect";
// electronConnect.client.create();


/*--------------------------------------------------------------------------
	OSC受信ログ
	メインプロセスで受けっとったUDPメッセージをIPC通信でもらいログ画面に出力
--------------------------------------------------------------------------*/
let $log = $("#log");

// レンダープロセスから、メインプロセスへメッセージを送りプロセス間の通信をセットアップ
ipcRenderer.send("renderer", "ping");

// メインプロセスからIPC通信で送られてくるデータ
ipcRenderer.on("server", (event, param) => {
	console.log(event, param);
	let val = $log.val() + param + "\n";
	$log.val(val);
	$log.scrollTop(10000000);
});

$("#log_clear").click(() => {
	$log.val("");
});


/*--------------------------------------------------------------------------
	UDP送信メッセージ
	テキストエリアの内容をIPC通信でメインプロセスに送信
--------------------------------------------------------------------------*/
let $client = $("#client");

$client.find("button").click(() => {
	let message = $("#message").val();

	// 空文字列の場合送らない
	if (message.replace(/\s+/g, "")){
		ipcRenderer.send("client", message);
	}
});
