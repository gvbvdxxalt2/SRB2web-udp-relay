var ws = require("ws");
var { handleGhost } = require("./ghost.js");
var WSErrorCodes = require("./errors.js");
var config = require("../config.js");
var wss = new ws.WebSocketServer({
  noServer: true,
  ...config.WebsocketConfig,
});
var {handleConnectWs} = require("../connect/index.js");

function handleUpgrade(request, socket, head) {
  var url = decodeURIComponent(request.url);
  var urlsplit = url.split("/");

  if (urlsplit[1] == "connect") {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      if (!urlsplit[2]) {
        ws.close(WSErrorCodes.BAD_PATH);
        return;
      }
      wss.emit("connection", ws, request);
      handleConnectWs(ws, urlsplit[2]);
    });
    return;
  }

  wss.handleUpgrade(request, socket, head, function done(ws) {
    handleGhost(ws);
    wss.emit("connection", ws, request);
    ws.close(WSErrorCodes.BAD_PATH);
  });
}

module.exports = { handleUpgrade };
