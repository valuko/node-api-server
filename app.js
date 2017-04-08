var https = require('https');
var http = require('http');
var server = http.createServer();

var baseUri = 'https://graph.ir.ee';
var predictPath = '/predictions/organizations/ee-11735006/bankruptcy-risk-scores';
var apiKey = 'c2t5cGUyMDE3XzI6anhacTVDS2Q=';
var options = {
    host: baseUri,
    //port: 8000,
    path: predictPath,
    headers: {
        'Authorization': 'Basic ' + apiKey
    }
};

server.on('request', function(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});
    //var query = require('url').parse(request.url, true).path;
    console.log(options);
    https.get(options, function(res){
        var buffer = "";
        res.on('data', function(chunk) {
            buffer += chunk;
        });

        res.on('end', function(){
            response.write(buffer);
            response.end();
        });
    });
});
var port = process.env.PORT || 8080;
server.listen(port);
console.log("Listening on port " + port + "......")

module.exports = server;
