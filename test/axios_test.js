"use strict";

var axios = require('axios');

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

getExternalDataAsync().then(function (result) {
    console.log(result.markets);
    console.log(result.stocks[0]);
  })