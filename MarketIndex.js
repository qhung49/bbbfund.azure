"use strict";

var DatabaseService = require('./DatabaseService.js');

module.exports = class Stock {
  static getAllAsync() {
    var query = `
SELECT [name], [index_norm], [change_percentage], [timestamp]
  FROM [dbo].[Market_History]
  ORDER BY [timestamp] ASC
`;
    return DatabaseService.executeQueryAsync(query).then(function(dataArray) {
      var result = {
        timestamp: [], 
        markets: [
          {name: 'VN', index: []}, 
          {name: 'VN30', index: []},
          {name: 'BBB', index: []}
        ]
      };
      dataArray.forEach(function(data) {
        if (data.name === 'BBB') {
          result.timestamp.push(new Date(data.timestamp).toISOString().slice(0,10));
        }
        result.markets.find(m => m.name === data.name).index.push(data.index_norm);
      });
      
      return result;
    });
  }
  
  static getLatestAsync(fundName) {
    var query = `
SELECT TOP 1 [name], [index_norm], [change_percentage]
  FROM [dbo].[Market_History]
  WHERE name = '${fundName}'
  ORDER BY [timestamp] DESC
`;
    return DatabaseService.executeQueryAsync(query).then(function(dataArray) {
      return {
        index: dataArray[0].index_norm,
        percentageChange: dataArray[0].change_percentage
      }
    });
  }
  
  static summarizeAsync(markets) {
    var timestamp = (new Date()).toISOString().slice(0,10);
    var query = '';
    markets.forEach(function(market) {
      query += `
INSERT INTO [dbo].[Market_History]([timestamp], [name], [index_norm], [index_raw], [change_percentage]) 
VALUES('${timestamp}','${market.name}', ${market.index}, ${market.indexRaw}, ${market.percentageChange})
`;
    });
    return DatabaseService.executeQueryAsync(query);
  }
}