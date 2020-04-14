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

var homeDataCache = null;

function refreshHomeDataCacheAsync() {
  return axios.all([Stock.getAllAsync(), MarketIndex.getAllAsync(), FundSummary.getLastSummaryAsync(), DatabaseService.getExternalDataAsync()])
    .then(axios.spread(function(stocks, indexes, lastSummary, externalData) {
      homeDataCache = DatabaseService.constructHomeResponse(stocks, indexes, lastSummary, externalData, 'BBB');
      console.log("Home data cache is refreshed");
    }));
}

function invalidateCache() {
  homeDataCache = null;
}

router.get('/homeData', function(req, res, next) {
  if (homeDataCache) {
    console.log('homeData from cache');
    res.json(homeDataCache);
  }
  else {
    console.log('Constructing homeData cache and response...');
    refreshHomeDataCacheAsync().then(function () {
        res.json(homeDataCache);
      })
      .catch(next);;
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
      invalidateCache();
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
      invalidateCache();
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
      homeDataCache = null;
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
      invalidateCache();
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
      invalidateCache();
      res.json();
    })
    .catch(next);
})

function summarizeDaily() {
  axios.all([Investor.getAllAsync(), Stock.getAllAsync(), MarketIndex.getLatestAsync('BBB'), FundSummary.getLastSummaryAsync(), DatabaseService.getExternalDataAsync()])
    .then(axios.spread(function(investors, stocks, latestIndex, lastSummary, externalData) {
      var cashData = stocks.find(s => s.name === 'CASH');
      
      var stockData = stocks.filter(item => item.name !== 'CASH');
      DatabaseService.processStockData(stockData, externalData.stocks);
      
      var stockValue = stockData.reduce( ((previous,current) => previous + current.currentPrice * current.numberShares), 0);
      var cashValue = cashData.numberShares * cashData.purchasePrice;
      var newCapital = investors.reduce( ((previous,current) => previous + current.total), 0);
      var fund = {
        capital: newCapital,
        profit: stockValue + cashValue - newCapital,
        fee: lastSummary.fee,
        dividend: lastSummary.dividend
      };
      
      var markets = DatabaseService.processMarketData(externalData.markets);
      markets[2].index = latestIndex.index * (stockValue + cashValue) / (newCapital + lastSummary.profit);
      markets[2].indexRaw = markets[2].index;
      markets[2].percentageChange = (markets[2].index - latestIndex.index) / latestIndex.index * 100;
      
      var filteredExternalStocks = externalData.stocks.filter(externalStock => {
        var found = stockData.find(databaseStock => databaseStock.name === externalStock.name);
        return  found !== undefined;
      });
      return Promise.all([Stock.summarizeAsync(filteredExternalStocks), FundSummary.summarizeAsync(fund), MarketIndex.summarizeAsync(markets)]);
    }))
    .then(function() {
      invalidateCache();
      console.log("Daily summary is done");
    })
    .catch(function(error) {
      console.log('Error during daily summary:' + error);
    });
}

function refreshHomeDataCache() {
  refreshHomeDataCacheAsync()
    .catch(function(error) {
      console.log('Error during refreshing homeData cache:' + error);
    });
}

// Cron job for daily summary at 8:05 UTC time monday to friday
cron.schedule('5 0 8 * * 1-5', summarizeDaily);

// Also refresh whenever the app is restarted
refreshHomeDataCache();

// Cron job for refreshing home data cache every 10 minutes during business hours
cron.schedule('0 */10 2-8 * * 1-5', refreshHomeDataCache);

module.exports = router;