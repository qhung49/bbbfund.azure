'use strict';

var express = require('express');
var axios = require('axios');
var cron = require('node-cron');

var Investor = require('./Investor');
var Stock = require('./Stock');
var MarketIndex = require('./MarketIndex');
var FundSummary = require('./FundSummary');
var DatabaseService = require('./DatabaseService');

var router = express.Router();

var databaseCache = null;

function handleHSCData(hscData) {
  var handleStockPromise = Promise.resolve();
  if (hscData.stocks.length !== databaseCache.stocks.length) {
    handleStockPromise = Stock.getLatestAsync().then(function(lastStocks) {
      lastStocks.forEach(lastStock => {
        databaseCache.stocks.find(s => s.name === lastStock.name).currentPrice = lastStock.currentPrice;
      });
    });
  }
  return handleStockPromise.then(function() {
    return DatabaseService.constructHomeResponse(databaseCache.stocks, databaseCache.indexes, databaseCache.lastSummary, hscData, 'BBB');
  });
}

router.get('/homeData', function(req, res, next) {
  if (databaseCache) {
    console.log('homeData from databaseCache');
    DatabaseService.getHSCDataAsync(databaseCache.stocks)
      .then(handleHSCData)
      .then(function (homeData) {
        res.json(homeData);
      })
      .catch(next);
  }
  else {
    console.log('homeData from compute');
    var stocksPromise = Stock.getAllAsync();
    var HSCDataPromise = stocksPromise.then(function(stocks) {
      return DatabaseService.getHSCDataAsync(stocks);
    });
    
    axios.all([stocksPromise, MarketIndex.getAllAsync(), FundSummary.getLastSummaryAsync(), HSCDataPromise])
      .then(axios.spread(function(stocks, indexes, lastSummary, hscData) {
        databaseCache = {
          stocks: stocks,
          indexes: indexes,
          lastSummary: lastSummary
        }
        return hscData;
      }))
      .then(handleHSCData)
      .then(function (homeData) {
        res.json(homeData);
      })
      .catch(next); 
  }
})

// Protected data
router.get('/protected/investors', function(req, res, next) {
  Investor.getAllAsync()
    .then(function(investors) {
      res.json({
        investors: investors
      });  
    })
    .catch(next);
})

router.get('/protected/transactions', function(req, res, next) {
  axios.all([Investor.getTransactionsAsync(), Stock.getTransactionsAsync()])
    .then(axios.spread(function(investorTransactions, stockTransactions) {
      res.json({
        investors: investorTransactions,
        stocks: stockTransactions
      });  
    }))
    .catch(next);
})

// Protected operations

router.post('/protected/addInvestment', function(req, res, next) {
  if (req.user.role !== 'admin') {
    var err = new Error('Access Denied');
    err.status = 403;
    next(err);
    return;
  }
  
  Investor.addTransactionAsync(req.body)
    .then(Investor.getAllAsync)
    .then(function(investors) {
      // Invalidate cache
      databaseCache = null;
      res.json({
        investors: investors
      });
    })
    .catch(next);
})

router.post('/protected/finalizeInvestment', function(req, res, next) {
  if (req.user.role !== 'admin') {
    var err = new Error('Access Denied');
    err.status = 403;
    next(err);
    return;
  }
  Investor.finalizeTransactionAsync(req.body)
    .then(function() {
      // Invalidate cache
      databaseCache = null;
      res.json();
    })
    .catch(next);
})

router.post('/protected/buyStock', function(req, res, next) {
  if (req.user.role !== 'admin') {
    var err = new Error('Access Denied');
    err.status = 403;
    next(err);
    return;
  }
  Stock.buyAsync(req.body)
    .then(function() {
      // Invalidate cache
      databaseCache = null;
      res.json();
    })
    .catch(next);
})

router.post('/protected/sellStock', function(req, res, next) {
  if (req.user.role !== 'admin') {
    var err = new Error('Access Denied');
    err.status = 403;
    next(err);
    return;
  }
  Stock.sellAsync(req.body)
    .then(function() {
      // Invalidate cache
      databaseCache = null;
      res.json();
    })
    .catch(next);
})

router.post('/protected/addDividend', function(req, res, next) {
  if (req.user.role !== 'admin') {
    var err = new Error('Access Denied');
    err.status = 403;
    next(err);
    return;
  }
  Stock.addDividend(req.body)
    .then(function() {
      // Invalidate cache
      databaseCache = null;
      res.json();
    })
    .catch(next);
})

function summarizeDaily() {
  var stocksPromise = Stock.getAllAsync();
  var HSCDataPromise = stocksPromise.then(function(stocks) {
    return DatabaseService.getHSCDataAsync(stocks);
  });
  
  axios.all([Investor.getAllAsync(), stocksPromise, MarketIndex.getLatestAsync('BBB'), FundSummary.getLastSummaryAsync(), HSCDataPromise])
    .then(axios.spread(function(investors, stocks, latestIndex, lastSummary, hscData) {
      DatabaseService.processStockData(stocks, hscData.stocks);
      var stockData = stocks.filter(item => item.name !== 'CASH');
      var cashData = stocks.find(s => s.name === 'CASH');
      var stockValue = stockData.reduce( ((previous,current) => previous + current.currentPrice * current.numberShares), 0);
      var cashValue = cashData.numberShares * cashData.purchasePrice;
      var newCapital = investors.reduce( ((previous,current) => previous + current.total), 0);
      var fund = {
        capital: newCapital,
        profit: stockValue + cashValue - newCapital,
        fee: lastSummary.fee,
        dividend: lastSummary.dividend
      };
      
      var markets = [
        {name: 'VN', startingIndex: 574.3, index: 0}, 
        {name: 'VN30', startingIndex: 615.7, index: 0},
        {name: 'BBB', startingIndex: 100.0, index: 0}
      ];
      DatabaseService.processMarketData(markets, hscData.markets);
      markets[2].index = latestIndex.index * (stockValue + cashValue) / (newCapital + lastSummary.profit);
      markets[2].indexRaw = markets[2].index;
      markets[2].percentageChange = (markets[2].index - latestIndex.index) / latestIndex.index * 100;
      
      return Promise.all([Stock.summarizeAsync(hscData.stocks), FundSummary.summarizeAsync(fund), MarketIndex.summarizeAsync(markets)])
    }))
    .then(function() {
      databaseCache = null;
    })
    .catch( function(error) {
      console.log('Error during daily summary:' + error);
    });
}

// Cron job for daily summary at 8:05 UTC time monday to friday
cron.schedule('5 0 8 * * 1-5', summarizeDaily);

module.exports = router;