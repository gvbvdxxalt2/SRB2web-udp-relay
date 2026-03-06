var dgram = require('dgram');
var peer = require("simple-peer");
var wrtc = require("wrtc");
var rtcConfig = require("./rtc-config.js");

function parseTarget(targetString) {
    const lastColon = targetString.lastIndexOf(':');
    
    // If no colon, assume standard port
    if (lastColon === -1) {
        return { ip: targetString.trim(), port: 5029 };
    }

    const ip = targetString.substring(0, lastColon);
    const portString = targetString.substring(lastColon + 1);
    const port = parseInt(portString, 10);

    // If port is invalid, default to 5029 but keep the IP
    if (isNaN(port) || port <= 0 || port > 65535) {
        return { ip: ip.trim(), port: 5029 };
    }
    
    return { ip, port };
}

function handleConnectWs(ws, url) {
    var target = parseTarget(url); 
    if (!target) return;
    
    var socketType = target.ip.includes(':') ? 'udp6' : 'udp4';
    var client = dgram.createSocket(socketType);
    client.setRecvBufferSize(40 * 1024 * 1024);
    var canSend = true;
    
    var peerConn = new peer({ initiator: true, wrtc: wrtc, config: rtcConfig });

    ws.on('message', (message) => {
        try {
            var data = JSON.parse(message);
            if (data.signal) {
                peerConn.signal(data.signal);
            }
        } catch (e) {}
    });

    peerConn.on("signal", (data) => {
        if (!canSend) return;
        ws.send(JSON.stringify({ signal: data }));
    });

    ws.send(JSON.stringify({ ready: true }));
    ws.send(JSON.stringify({ webrtc: true }));

    peerConn.on("connect", () => {
        const channel = peerConn._channel;
        channel.bufferedAmountLowThreshold = 999999999999;
        if (!canSend) return;
    });

    peerConn.on("data", (data) => {
        if (!canSend) return;
        try{
        client.send(data, target.port, target.ip);
        }catch(e){cleanup();}
    });

    client.on('message', (msg) => {
        if (canSend && peerConn.connected) {
            peerConn.send(msg);
        }
    });

    const cleanup = () => {
        if (!canSend) return;
        canSend = false;
        try { ws.close(); client.close(); } catch(e) {}
        peerConn.destroy();
    };

    ws.on('close', cleanup);
    peerConn.on('close', cleanup);
    peerConn.on('error', cleanup);
}

module.exports = { handleConnectWs };
