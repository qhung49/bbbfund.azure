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
          result.timestamp.push(new Date(data.timestamp).getTime());
        }
        result.markets.find(m => m.name === data.name).index.push(data.index_norm);
      });
      
      return result;
    });
  }
}