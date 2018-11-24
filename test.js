var request = require("request");
var url = "http://www.airport-data.com/api/ac_thumb.json?m=" + "400A0B";
request(
    {
        method: "GET",
        uri: "https://franspaco.azurewebsites.net/airplanes",
        gzip: true
    },
    function(error, response, body) {
        // body is the decompressed response body
        console.log(
            "server encoded the data as: " +
            (response.headers["content-encoding"] || "identity")
        );
        console.log("the decoded data is: " + body);
    }
);
