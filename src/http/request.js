var http = require("http");
var https = require("https");
var URL = require("url");

var headers = {
	"User-Agent":"Gvbvdxx's SRB2 UDP to SRB2 Web connection server",
	"X-Request-Description": "Server for Gvbvdxx's SRB2 web port, used to forward UDP packets from SRB2 to web clients.",
	"X-Request-Source": "https://github.com/gvbvdxxalt2/SRB2web-udp-relay"
};

function getRequest(url) {
	var parsedURL = URL.parse(url);
	var requestModule = null;
	if (parsedURL.protocol == "http:") {
		requestModule = http;
	}
	if (parsedURL.protocol == "https:") {
		requestModule = https;
	}
	if (!requestModule) {
		throw new Error("Unrecognized protocol for GET request "+parsedURL.protocol);
	}
	return new Promise((resolve, reject) => {
		
		var request = requestModule.request({
			method:"GET",
			headers: headers,
			...parsedURL
		},(res) => {
			var data = [];
			res.on("data", (chunk) => {
				data.push(chunk);
			});
			res.on("end", async () => {
				if (res.statusCode == 302) {
					resolve(await getRequest(res.headers.location));
				} else {
					if (res.statusCode !== 200) {
						reject("Response not OK. "+http.STATUS_CODES[res.statusCode.toString()]);
					} else {
						resolve(Buffer.concat(data));
					}
				}
			});
		});
		request.end();
	});
}

module.exports = {getRequest};