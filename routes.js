'use strict';

var express = require('express');
var axios = require('axios');

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
    return DatabaseService.constructHomeResponse(
      databaseCache.investors, databaseCache.stocks, databaseCache.indexes, databaseCache.lastSummary, hscData, 'BBB');
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
    return;
  }
  else {
    console.log('homeData from compute');
    var stocksPromise = Stock.getAllAsync();
    var HSCDataPromise = stocksPromise.then(function(stocks) {
      return DatabaseService.getHSCDataAsync(stocks);
    });
    
    axios.all([Investor.getAllAsync(), stocksPromise, MarketIndex.getAllAsync(), FundSummary.getLastSummaryAsync(), HSCDataPromise])
      .then(axios.spread(function(investors, stocks, indexes, lastSummary, hscData) {
        databaseCache = {
          investors: investors,
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

router.post('/protected/buyStock', function(req, res, next) {
  /*
  {
    name,
    numberShares,
    price
  }
  */
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

module.exports = router;