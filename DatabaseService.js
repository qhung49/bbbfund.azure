"use strict";

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var axios = require('axios');

var config = {
  userName: process.env.db_writer_login,
  password: process.env.db_writer_password,
  server: 'bbbfund-dbserver.database.windows.net',
  
  options: {
    database: 'officialdb_x',
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

function processMarketData(data) {
  var markets = [
    {name: 'VN', startingIndex: 574.3, index: 0}, 
    {name: 'VN30', startingIndex: 615.7, index: 0},
    {name: 'BBB', startingIndex: 100.0, index: 0}
  ];

  for (var i=0; i<2; ++i) {
    var rawIndexName = markets[i].name;
    if (markets[i].name === 'VN') {
      rawIndexName = 'VNINDEX';
    }
    
    var found = data.find(i => i.name === rawIndexName);

    markets[i].indexRaw = parseFloat(found.index);
    markets[i].index = (parseFloat(found.index) / markets[i].startingIndex * 100);
    markets[i].percentageChange = parseFloat(found.percent);
  }

  return markets;
}

/*
data:
[
  {
    name (a)
    reference (b)
    ceiling (c)
    floor (d)
    tradePrice (l)
    tradeVolume (tb)
  }
]
*/
function processStockData(stocks, data) {
  for (var i=0; i< stocks.length; ++i) {
    var found = data.find(s => s.name === stocks[i].name);

    stocks[i].currentPrice = parseFloat(found.tradePrice);
    if (stocks[i].currentPrice <= 0.1) {
      stocks[i].currentPrice = parseFloat(found.reference);
    }
  }
}

// From cafef
function getExternalDataAsync() {
  return axios.all([
    axios.get('https://banggia.cafef.vn/stockhandler.ashx'),
    axios.get('https://banggia.cafef.vn/stockhandler.ashx?center=2'),
    axios.get('https://banggia.cafef.vn/stockhandler.ashx?index=true')
  ])
    .then(axios.spread(function(hcmResponse, hnResponse, indexResponse) {
      var stocks = hcmResponse.data.concat(hnResponse.data).map(raw => {
        return {
          name: raw.a,
          reference: raw.b,
          ceiling: raw.c,
          floor: raw.d,
          tradePrice: raw.l,
          tradeVolume: raw.tb
        }
      });
      return {markets: indexResponse.data, stocks: stocks}; 
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

function constructHomeResponse(stocks, indexes, lastSummary, externalData, fundName) {
  var summary = { 
    markets: processMarketData(externalData.markets)
  };

  var cashData = stocks.find(item => item.name === 'CASH');
  
  var stockData = stocks.filter(item => item.name !== 'CASH');
  processStockData(stockData, externalData.stocks);
  
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

module.exports.processMarketData = processMarketData;
module.exports.processStockData = processStockData;

module.exports.getExternalDataAsync = getExternalDataAsync;

module.exports.executeQueryAsync = executeQueryAsync;
module.exports.executeQuery = executeQuery;
module.exports.isBusinessHour = isBusinessHour;
module.exports.constructHomeResponse = constructHomeResponse;
