var https = require('https');
var http = require('http');
var server = http.createServer();

var baseUri = 'graph.ir.ee';
var predictPath = '/predictions/organizations/ee-11735006/bankruptcy-risk-scores';
var apiKey = 'c2t5cGUyMDE3XzI6anhacTVDS2Q=';
var options = {
    protocol: 'https:',
    host: baseUri,
    port: 443,
    path: predictPath,
    headers: {
        'Authorization': 'Basic ' + apiKey,
        'Content-Type': 'application/json'
    }
};

server.on('request', function(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});
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
