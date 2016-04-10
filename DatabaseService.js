"use strict";

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var axios = require('axios');

var config = {
  userName: process.env.db_writer_login,
  password: process.env.db_writer_password,
  server: 'bbbfund-dbserver.database.windows.net',
  
  options: {
    database: 'officialdb',
    rowCollectionOnRequestCompletion: true,
    encrypt: true // for SQL Azure
  }
};

function executeQueryAsync(query) {
  return new Promise(function(resolve, reject) {
    executeQuery(query, function(err, data) {
      if (err != null) return reject(err);
      else resolve(data);
    });
  });
}

function executeQuery(query, callback) {
  var connection = new Connection(config);
  var result = null;

  connection.on('connect', function(err) {
    if (err) {
      callback(err, null);
      return;
    }
      
    var request = new Request(query, function(err, rowCount, rows) {
      if (err) {
        callback(err, null);
      } else {
        // sanitize rows to result
        result = [];
        rows.forEach(function(row) {
          var resultItem = {}
          row.forEach(function(column) {
            resultItem[column.metadata.colName] = column.value
          });
          result.push(resultItem);
        });
        
        callback(null, result);
      }
      connection.close();
    });

    connection.execSql(request);
  }); 
}

function processMarketData(markets, data) {
  // first 2 market data is for VN and VN30
  for (var i=0; i< 2; ++i) {
    var marketDetails = data[i].split(',');
    markets[i].indexRaw = parseFloat(marketDetails[3]);
    markets[i].index = (parseFloat(marketDetails[3]) / markets[i].startingIndex * 100);
    markets[i].percentageChange = parseFloat(marketDetails[5]);
  }
}

function processStockData(stocks, data) {
  for (var i=0; i< data.length; ++i) {
    var stockDetails = data[i].split(',');
    var currentPrice = parseFloat(stockDetails[10]); // trade price
    if (currentPrice === 0) {
      currentPrice = parseFloat(stockDetails[1]); // reference price
    }
    var found = stocks.find(s => s.name === stockDetails[0]);
    if (found) {
      found.currentPrice = currentPrice;
    }
  }
}

function getHSCDataAsync(stocks) {
  var stockCookie = stocks.map(stock => stock.name).join('|');
  var headers = { 'Cookie': '_kieHoSESF=' + stockCookie + '; _kieHNXSF=' + stockCookie };
  return axios.all([
    axios.get('http://priceonline.hsc.com.vn/Process.aspx?Type=MS', {headers: headers}),
    axios.get('http://priceonline.hsc.com.vn/hnpriceonline/Process.aspx?Type=MS', {headers: headers}),
  ])
    .then(axios.spread(function(hcmResponse, hnResponse) {
      var marketData = hcmResponse.data.split('^')[0].split('|');
      var stockData = (hcmResponse.data.split('^')[1] + hnResponse.data.split('^')[1]).split('|');
      
      return {markets: marketData, stocks: stockData}; 
    }));
}

function isBusinessHour(date) {
  if (date.getUTCDay() === 0 || date.getUTCDay() === 6) { // Saturday and Sunday
    return false;
  }
  
  if (date.getUTCHours() < 2 || date.getUTCHours() >= 8) { // Outside Vietnam business hours
    return false;
  }
  
  return true;
}

function constructHomeResponse(stocks, indexes, lastSummary, hscData, fundName) {
  var summary = { 
    markets: [
      {name: 'VN', startingIndex: 574.3, index: 0}, 
      {name: 'VN30', startingIndex: 615.7, index: 0},
      {name: 'BBB', startingIndex: 100.0, index: 0}
    ]
  };
  
  if (hscData.stocks.length === stocks.length) { // Only process if HSC Data is valid
    processStockData(stocks, hscData.stocks);
  }
  processMarketData(summary.markets, hscData.markets);
  
  var cashData = stocks.find(item => item.name === 'CASH');
  var stockData = stocks.filter(item => item.name !== 'CASH');
  
  summary.stockPurchaseValue = stockData.reduce( ((previous,current) => previous + current.purchasePrice * current.numberShares), 0);
  summary.stockCurrentValue = stockData.reduce( ((previous,current) => previous + current.currentPrice * current.numberShares), 0);
  summary.cash = cashData.numberShares * cashData.purchasePrice;
  summary.capital = lastSummary.capital;
  summary.profit = summary.stockCurrentValue + summary.cash - summary.capital;
  
  var fundIndexes = indexes.markets.find(m => m.name === fundName).index;
  
  var fundSummary = summary.markets.find(m => m.name === fundName);
  if (isBusinessHour(new Date())) {
    console.log("In business hours. Time = " + (new Date()).toISOString());
    fundSummary.index = fundIndexes[fundIndexes.length-1] * (summary.capital + summary.profit) / (summary.capital + lastSummary.profit);
    fundSummary.percentageChange = (fundSummary.index - fundIndexes[fundIndexes.length-1]) / fundIndexes[fundIndexes.length-1] * 100;
  } 
  else { 
    fundSummary.index = fundIndexes[fundIndexes.length-1]
    fundSummary.percentageChange = (fundSummary.index - fundIndexes[fundIndexes.length-2]) / fundIndexes[fundIndexes.length-2] * 100;
  }
  
  summary.fee = lastSummary.fee;
  summary.dividend = lastSummary.dividend;
  
  return {
    stocks: stocks,
    indexes: indexes,
    summary: summary
  };
}

module.exports.processStockData = processStockData;
module.exports.processMarketData = processMarketData;

module.exports.getHSCDataAsync = getHSCDataAsync;

module.exports.executeQueryAsync = executeQueryAsync;
module.exports.executeQuery = executeQuery;
module.exports.isBusinessHour = isBusinessHour;
module.exports.constructHomeResponse = constructHomeResponse;