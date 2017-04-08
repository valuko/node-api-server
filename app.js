var http = require('http');
var https = require('https');
var config = require('./config.json');
var cachedCompanies = {};

var baseOptions = {
    protocol: 'https:',
    host: config.baseUrl,
    port: 443,
    path: '',
    headers: {
        'Authorization': 'Basic ' + config.apiKey,
        'Content-Type': 'application/json'
    }
};

//=======================
// End Vars
// ======================

function buildOptions(path) {
    return {
        protocol: 'https:',
        host: config.baseUrl,
        port: 443,
        path: path,
        headers: {
            'Authorization': 'Basic ' + config.apiKey,
            'Content-Type': 'application/json'
        }
    };
}

function companyFetch(companyName, callBack) {
    var urlPath = "/organizations?legal-name="+ companyName;
    var options = buildOptions(urlPath);
    https.get(options, callBack);
}

var server = http.createServer();

var predictPath = '/predictions/organizations/ee-11735006/bankruptcy-risk-scores';

server.on('request', function(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});
    companyFetch("Adcash", function (res) {
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
