import React from 'react';
import Griddle from 'griddle-react';
import * as Utilities from './Utilities.js';

export default class StockTable extends React.Component {
  
  render() {
    var results = this.props.data.filter(item => item.name !== 'CASH' && item.numberShares > 0).map( function(item) {
      var profit = (item.currentPrice - item.purchasePrice) / item.purchasePrice;
      
      return {
        "Symbol": item.name,
        "Quantity": item.numberShares.toFixed(0),
        "Purchase Price": item.purchasePrice.toFixed(2),
        "Current Price": item.currentPrice.toFixed(2),
        "Profit (%)": (profit * 100).toFixed(2),
        "Current Value": item.currentPrice * item.numberShares
      };
    });
    
    var columnMetadata = [
      {
        columnName: "Current Value",
        visible: true,
        customComponent: CurrentValueComponent
      }
    ];
    
    return (
      <div className="row">
        <div className="col-xs-12">
          <h2 className="page-header">Portfolio</h2>
          <Griddle results={results} 
                  initialSort="Current Value" 
                  initialSortAscending={false} 
                  columnMetadata={columnMetadata}
                  showFilter={true}
                  noDataMessage="Loading stock data..." />
        </div>
      </div>
    );
  }
}

class CurrentValueComponent extends React.Component {
  render() {
    return(
      <div>{Utilities.numberWithCommas(this.props.data)}</div>
    );
  }
} 