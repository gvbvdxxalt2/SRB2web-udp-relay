var dgram = require('dgram');
var peer = require("simple-peer");
var wrtc = require("wrtc");
var rtcConfig = require("./rtc-config.js");

function parseTarget(targetString) {
    const lastColon = targetString.lastIndexOf(':');
    if (lastColon === -1) return { ip: targetString.trim(), port: 5029 };
    const ip = targetString.substring(0, lastColon);
    const port = parseInt(targetString.substring(lastColon + 1), 10);
    return (isNaN(port) || port <= 0 || port > 65535) ? { ip: ip.trim(), port: 5029 } : { ip, port };
}

function handleConnectWs(ws, url) {
    var target = parseTarget(url);
    if (!target) return;

    var client = dgram.createSocket(target.ip.includes(':') ? 'udp6' : 'udp4');
    var canSend = true;
    var packetQueue = [];
    var isPeerConnected = false;

    var peerConn = new peer({
        initiator: true,
        wrtc: wrtc,
        config: rtcConfig,
        channelConfig: { ordered: false, maxRetransmits: 0 },
        trickle: true
    });

    ws.on('message', (message) => {
        try {
            var data = JSON.parse(message);
            if (data.signal) peerConn.signal(data.signal);
        } catch (e) {}
    });

    peerConn.on("signal", (data) => {
        if (!canSend) return;
        ws.send(JSON.stringify({ signal: data }));
    });

    peerConn.on("connect", () => {
        isPeerConnected = true;
        // Drain buffered packets
        while (packetQueue.length > 0 && isPeerConnected) {
            safeSend(packetQueue.shift());
        }
    });

    ws.send(JSON.stringify({ready: true}));
    ws.send(JSON.stringify({webrtc: true}));

    function safeSend(data) {
        if (!canSend || !isPeerConnected) return;
        // 2. Backpressure: Only send if buffer is healthy (< 512KB)
        if (peerConn._channel && peerConn._channel.bufferedAmount < 512 * 1024) {
            try { peerConn.send(data); } catch (e) { cleanup(); }
        } else {
            // Buffer full: drop or handle as needed
        }
    }

    peerConn.on("data", (data) => {
        if (!canSend) return;
        try { client.send(data, target.port, target.ip); } catch (e) { cleanup(); }
    });

    client.on('message', (msg) => {
        if (!canSend) return;
        if (!msg || typeof msg.length === 'undefined') return;

        if (isPeerConnected) {
            safeSend(msg);
        } else {
            // 3. Buffer packets if we aren't connected yet (Add-on support)
            packetQueue.push(msg);
        }
    });

    const cleanup = () => {
        if (!canSend) return;
        canSend = false;
        isPeerConnected = false;
        try { ws.close(); } catch (e) {}
        try { client.close(); } catch (e) {}
        try { peerConn.destroy(); } catch (e) {}
    };

    peerConn.on('close', cleanup);
    peerConn.on('error', cleanup);
}

module.exports = { handleConnectWs };
