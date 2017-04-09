var http = require('http');
var https = require('https');
var config = require('./config.json');
//var request = require('request');
var cachedCompanies = {};
var reqCompany = "Adcash";
let globResponse;
let globHandler;
let currentCompany;
let currentCompName;
let boardFormatStr = '{comp} has a {cnt} board member(s): {s}';
let financeFormatStr = 'The financial status of {comp} is as follows: {s}';
let financeEmptyStr = 'There is no financial information for {comp} at the moment';
let boardEmptyStr = 'There is no board information for {comp} at the moment';
let companyEmptyStr = 'At the moment I cannot find the requested information on {comp}';

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
        currentCompany = cachedCompanies[companyName];
        onFoundCallback(currentCompany);
    }
}

function writeResult(respJson) {
    globResponse.write(JSON.stringify(respJson));
    globResponse.end();
}

function writeError(errCode, errMessage) {
    response.writeHead( errCode, {error: "Unknown action type"}, {'content-type' : 'application/json'});
    response.end(errMessage);
}

function formatBoardMessage(jsonData) {

}

var handleCompanyCache = function (apiResp) {
    var items = apiResp.result.items.pop();
    if (typeof items === 'undefined') {
        const displayMsg = companyEmptyStr.replace(/{comp}/, currentCompName);
        writeResult({message: displayMsg, data: []});
    } else {
        cachedCompanies[reqCompany] = items;
        // extract ID
        cachedCompanies[reqCompany]['id'] = items['_about'].substr(items['_about'].lastIndexOf('/')+1);
        currentCompany = reqCompany;
        globHandler(cachedCompanies[reqCompany]);
    }
};

function snakeToCamel(s){
    return s.replace(/(\-\w)/g, function(m){return ' '+m[1].toUpperCase();});
}

var parseFinResult = function (resultJson) {
    let resultItems = [];
    let msg = '';
    resultJson.result.items.forEach(function (item) {
        let val = {};
        const elemName = item.elementType.substring(item.elementType.lastIndexOf('/')+1);
        const elem = snakeToCamel(elemName);
        val[elem] = item.value;
        resultItems.push(val);
        msg += elem+': '+item.value+' EUR, ';
    });
    if (resultItems.length > 0) {
        const displayMsg = financeFormatStr.replace(/{s}/, msg).replace(/{comp}/, currentCompName);
        writeResult({message: displayMsg, data: resultItems});
    } else {
        const displayMsg = financeEmptyStr.replace(/{comp}/, currentCompName);
        writeResult({message: displayMsg, data: resultItems});
    }
};

var parseBoardResult = function (resultJson) {
    let resultItems = [];
    let msg = '';
    let compName = '';
    resultJson.result.items.forEach(function (item) {
        let val = {};
        val.name = item.member.givenName + item.member.familyName;
        val.since = typeof item.memberDuring.hasBeginning !== undefined ? item.memberDuring.hasBeginning.inXSDDateTime : "";
        val.company = item.organization.legalName;
        compName = val.company;
        resultItems.push(val);
        msg += val.name + ', ';
    });

    if (resultItems.length > 0) {
        const displayMsg = boardFormatStr.replace(/{s}/, msg).replace(/{comp}/, compName).replace(/{cnt}/, resultItems.length);
        writeResult({message: displayMsg, data: resultItems});
    } else {
        const displayMsg = financeEmptyStr.replace(/{comp}/, currentCompName);
        writeResult({message: displayMsg, data: resultItems});
    }
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
        case 'finance':
        case 'financial':
            return fetchCompanyFin;
        break;
        case 'history': return fetchCompanyHistory;
        break;
        case 'board':
        case 'board-members':
            return fetchCompanyBoard;
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
    currentCompName = reqParams.company.replace(/\W+/g, "");
    companyFetch(currentCompName, actionHandler, handleCompanyCache);
});
var port = process.env.PORT || 8080;
server.listen(port);
console.log("Listening on port " + port + "......")

module.exports = server;
