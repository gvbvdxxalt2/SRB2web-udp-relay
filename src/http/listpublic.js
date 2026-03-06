const dgram = require('dgram');
var {getRequest} = require('./request.js');
var config = require("../config.js");
var { isPrivateIp } = require("../req-util.js");

var allowedCharacters = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()\\//";

//Template info:
//[
//  {
//    "url":"1.2.3.4:5029",
//    "name":"SRB2 server",
//    "map":"MAP02",
//    "mapTitle":"Greenflower Zone 2",
//    "ingamePlayers":1,
//    "playerNames":["Gvbvdxx"],
//    "usesWebRTC":true
//  }
//]

function decodePublicServerBody(body = "") {
    var info = [];

    var lines = body.split("\n");

    lines.forEach((line) => {
        var parts = line.split(" ");
        parts = parts.map((p) => p.trim());
        if (parts.length < 1) {
            return;
        }

        var ip = parts[0];
        var port = parts[1];
        var name = decodeURIComponent(parts[2]);
        var version = (""+parts[3]).trim();

        if (typeof ip !== "string") {
            return;
        }
        if (typeof port !== "string") {
            return;
        }
        if (typeof name !== "string") {
            return;
        }

        if (version !== config.SRB2WEB_VERSION) {
            return;
        }

        name = name.split("").filter((c) => allowedCharacters.indexOf(c) !== -1).join("");

        info.push({
            url: `${ip}:${port}`,
            name: name,
            map: "",
            mapName: "",
            ingamePlayers: 0,
            playerNames: [],
            usesWebRTC: true
        });
    });

    return info;
}

async function fetchPublicServers() {
    var responseInfo = await getRequest(config.MASTER_SERVER+"/servers");
    var responseText = responseInfo.toString();

    return decodePublicServerBody(responseText);
}

module.exports = {fetchPublicServers};