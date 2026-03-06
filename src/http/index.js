var { serveStatic, setCorsHeaders } = require("../serve");
var config = require("../config.js");
var URL = require("url");
var {fetchPublicServers} = require("./listpublic.js");

function onHttpRequest(req, res) {
  setCorsHeaders(res);

  var url = decodeURIComponent(req.url);
  var urlsplit = url.split("/");

  if (urlsplit[1] == "status") {
    res.end(
      JSON.stringify({
        status: "online",
        name: config.name,
        description: config.description,
      })
    );
    return;
  }
  if (urlsplit[1] == "public") {
    (async function () {
        var list = await fetchPublicServers();
        res.end(JSON.stringify(list));
    })().catch((e) => {
        res.statusCode = 500;
        res.end("");
    });
    return;
  }

  serveStatic(req, res);
}

module.exports = { onHttpRequest };
