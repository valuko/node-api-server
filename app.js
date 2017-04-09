var http = require('http');
var https = require('https');
var config = require('./config.json');
//var request = require('request');
var cachedCompanies = {};
var reqCompany = "Adcash";
let globResponse;
let globHandler;

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
var params=function(req){
    let q=req.url.split('?'),result={};
    if(q.length>=2){
        q[1].split('&').forEach((item)=>{
            try {
                result[item.split('=')[0]]=item.split('=')[1];
            } catch (e) {
                result[item.split('=')[0]]='';
            }
        })
    }
    return result;
};

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
};

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

var handleCompanyCache = function (apiResp) {
    var items = apiResp.result.items.pop();
    cachedCompanies[reqCompany] = items;
    // extract ID
    cachedCompanies[reqCompany]['id'] = items['_about'].substr(items['_about'].lastIndexOf('/')+1);
    globHandler(cachedCompanies[reqCompany]);
};

function snakeToCamel(s){
    return s.replace(/(\-\w)/g, function(m){return m[1].toUpperCase();});
}

var parseFinResult = function (resultJson) {
    let resultItems = [];
    resultJson.result.items.forEach(function (item) {
        let val = {};
        const elemName = item.elementType.substring(item.elementType.lastIndexOf('/')+1);
        val[snakeToCamel(elemName)] = item.value;
        resultItems.push(val);
    });
    writeResult(resultItems);
};

var parseBoardResult = function (resultJson) {
    let resultItems = [];
    resultJson.result.items.forEach(function (item) {
        let val = {};
        val.name = item.member.givenName + item.member.familyName;
        val.since = typeof item.memberDuring.hasBeginning !== undefined ? item.memberDuring.hasBeginning.inXSDDateTime : "";
        val.company = item.organization.legalName;
        resultItems.push(val);
    });
    writeResult(resultItems);
};

var fetchCompanyFin = function (companyDetails) {
    const compId = companyDetails.id;
    const finPath = '/organizations/'+compId+'/financial-statement-elements?periodType=year';

    var finOptions = buildOptions(finPath);
    https.get(finOptions, function (res) {
        var buffer = "";
        res.on('data', function(chunk) {
            buffer += chunk;
        });

        res.on('end', function(){
            // decode the json and store before the next call
            //writeResult(JSON.parse(buffer));
            parseFinResult(JSON.parse(buffer));
        });
    });
};

var fetchCompanyHistory = function (companyDetails) {

};

var fetchCompanyBoard = function (companyDetails) {

    const boardPath = '/organizations/'+companyDetails.id+'/board-members';
    https.get(buildOptions(boardPath), function (res) {
        let buffer = "";
        res.on('data', function(chunk) {
            buffer += chunk;
        });

        res.on('end', function(){
            // decode the json and store before the next call
            parseBoardResult(JSON.parse(buffer));
        });
    });
};

var fetchCompanyCredit = function (companyDetails) {

};

function getActionCallback(actionType) {
    switch (actionType) {
        case 'finance': return fetchCompanyFin;
        break;
        case 'history': return fetchCompanyHistory;
        break;
        case 'board': return fetchCompanyBoard;
        break;
        case 'credit': return fetchCompanyCredit;
        break;
    }
}

var server = http.createServer();

server.on('request', function(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});
    globResponse = response;
    let reqParams = params(request);
    if (typeof reqParams['company'] === 'undefined') {
        response.writeHead( 400, {error: "Missing params"}, {'content-type' : 'application/json'});
        response.end( 'Company name must be provided');
        return;
    }
    const actionHandler = getActionCallback(reqParams['action']);
    if (typeof actionHandler === 'undefined') {
        response.writeHead( 400, {error: "Unknown action type"}, {'content-type' : 'application/json'});
        response.end( 'Action type can not be determined');
        return;
    }
    globHandler = actionHandler;
    companyFetch(reqParams.company, actionHandler, handleCompanyCache);
});
var port = process.env.PORT || 8080;
server.listen(port);
console.log("Listening on port " + port + "......")

module.exports = server;
