"use strict";

var DatabaseService = require('./DatabaseService.js');

module.exports = class Investor {
  static getAllAsync() {
    var query = `
select Investor.investorId, name, start_date, end_date, rate, value 
from Transaction_Investor left join Investor 
on Investor.investorId = Transaction_Investor.investorId  
where end_date IS NULL OR end_date > getutcdate()
order by investorId
`;
    return DatabaseService.executeQueryAsync(query)
      .then(function(dataArray) {
        var result = [];
        dataArray.forEach(function(data) {
          var timeSpan = Date.now() - (new Date(data.start_date).getTime());
          var numberOfDays = timeSpan/1000/60/60/24;
          var estimatedProfit = (data.value * data.rate) * numberOfDays / (365);
          var found = false;
          for (var i = 0; i < result.length; ++i) {
            if (result[i].investorId === data.investorId) {
              result[i].total += data.value;
              result[i].estimatedProfit += Math.round(estimatedProfit);
              found = true;
              break;
            }
          }
          if (!found) {
            result.push({
              investorId: data.investorId,
              name: data.name,
              total: data.value,
              estimatedProfit: Math.round(estimatedProfit)
            })
          }
        });
        
        return result;
      })
  }
    
  static getTransactionsAsync() {
    var query = `
select transactionId, name, start_date, end_date, rate, value 
from Transaction_Investor left join Investor 
on Investor.investorId = Transaction_Investor.investorId
order by start_date DESC
`;
    return DatabaseService.executeQueryAsync(query)
      .then(function(dataArray) {
        return dataArray.map(function(t) {
          return {
            transactionId: t.transactionId,
            name: t.name,
            startDate: new Date(t.start_date).getTime(),
            endDate: new Date(t.end_date).getTime(),
            rate: t.rate,
            value: t.value
          };
        });
      });
  }
    
  static addTransactionAsync(data) {
    // data: {name, start, rate, value}
    if (!data.name || !data.start || !data.value) {
      //TODO: more validation
      var error = new Error("Invalid input");
      error.status = 400;
      return Promise.reject(error);
    }
    
    var query = `
select investorId 
from Investor
where name = '${data.name}' 
`;
    return DatabaseService.executeQueryAsync(query)
        .then(function(dataArray) {
          if (dataArray.length === 0) {
            var error = new Error("No investor found");
            error.status = 400;
            throw error;
          }
          
          var investorId = dataArray[0].investorId;
          var query = `
BEGIN TRAN T1
INSERT INTO Transaction_Investor (transactionId, investorId, start_date, rate, value, notes)
VALUES (NEWID(), ${investorId}, '${data.start}', ${data.rate}, ${data.value}, 'From website')

UPDATE Portfolio
SET number_shares = number_shares + ${data.value} 
WHERE stock_name = 'CASH'

UPDATE Summary_History
SET capital = capital + ${data.value} 
WHERE timestamp = (SELECT TOP 1 timestamp from [dbo].[Summary_History] ORDER BY timestamp DESC)

COMMIT TRAN T1
`;
          return DatabaseService.executeQueryAsync(query);
        });
    }

  static finalizeTransactionAsync(data) {
    // data: {transactionId, endDate, withdrawValue}
    if (!data.transactionId || !data.endDate || !data.withdrawValue || !data.originalValue) {
      //TODO: more validation
      var error = new Error("Invalid input");
      error.status = 400;
      return Promise.reject(error);
    }

    var profit = data.withdrawValue - data.originalValue;

    var query = `
BEGIN TRAN T1
UPDATE Transaction_Investor
SET end_date ='${data.endDate}', notes = 'Finalize with withdraw value = ${data.withdrawValue}'
WHERE transactionId='${data.transactionId}'

INSERT INTO Transaction_Investor (transactionId, investorId, start_date, rate, value, notes)
VALUES (NEWID(), 1, '${data.endDate}', 0.00, 'Income for transaction ${data.transactionId}', ${profit})

UPDATE Portfolio
SET number_shares = number_shares - ${data.withdrawValue} 
WHERE stock_name = 'CASH'

UPDATE Summary_History
SET capital = capital - ${data.originalValue}
WHERE timestamp = (SELECT TOP 1 timestamp from [dbo].[Summary_History] ORDER BY timestamp DESC)

COMMIT TRAN T1
`;
    console.log(query);
    return DatabaseService.executeQueryAsync(query);
  }
}