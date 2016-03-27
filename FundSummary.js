"use strict";

var DatabaseService = require('./DatabaseService.js');

module.exports = class FundSummary {
  static getLastSummaryAsync() {
    var query = `
SELECT TOP 1 [timestamp], [profit], [capital], [dividend], [fee]
  FROM [dbo].[Summary_History]
  ORDER BY [timestamp] DESC
`;
    return DatabaseService.executeQueryAsync(query).then(function(dataArray) {
      return {
        profit: dataArray[0].profit,
        capital: dataArray[0].capital,
        dividend: dataArray[0].dividend,
        fee: dataArray[0].fee
      }
    });
  }
}