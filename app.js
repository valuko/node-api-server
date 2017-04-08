var http = require('http');
var https = require('https');
var config = require('./config.json');
//var request = require('request');
var cachedCompanies = {};
var reqCompany = "Adcash";
let globResponse;

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

function companyFetch(companyName, onFoundCallback, onNotFoundCallback) {
    if (typeof cachedCompanies[companyName] === "undefined") {
        var urlPath = "/organizations?legal-name="+ companyName;
        var options = buildOptions(urlPath);
        https.get(options, function (res) {
            var buffer = "";
            res.on('data', function(chunk) {
                buffer += chunk;
            });

            res.on('end', function(){
                // decode the json and store before the next call
                onNotFoundCallback(JSON.parse(buffer));
            })
        });
    } else {
        const orgDetails = cachedCompanies[companyName];
        onFoundCallback(orgDetails);
    }
}

function writeResult(respJson) {
    globResponse.write(JSON.stringify(respJson));
    globResponse.end();
}

var fetchCompanyFin = function (companyDetails) {
    const compId = companyDetails.id;
    const finPath = '/organizations/'+compId+'/financial-statement-elements?periodType=year';

    var finOptions = buildOptions(finPath); console.log(finOptions);
    https.get(finOptions, function (res) {
        var buffer = "";
        res.on('data', function(chunk) {
            buffer += chunk;
        });

        res.on('end', function(){
            // decode the json and store before the next call
            writeResult(JSON.parse(buffer));
        })
    });
};

var handleCompanyCache = function (apiResp) {
    var items = apiResp.result.items.pop();
    cachedCompanies[reqCompany] = items;
    // extract ID
    cachedCompanies[reqCompany]['id'] = items['_about'].substr(items['_about'].lastIndexOf('/')+1);
    fetchCompanyFin(cachedCompanies[reqCompany]);
};

var server = http.createServer();

var predictPath = '/predictions/organizations/ee-11735006/bankruptcy-risk-scores';

server.on('request', function(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});
    globResponse = response;

    companyFetch(reqCompany, fetchCompanyFin, handleCompanyCache);
});
var port = process.env.PORT || 8080;
server.listen(port);
console.log("Listening on port " + port + "......")

module.exports = server;
