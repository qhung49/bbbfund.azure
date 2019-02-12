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
        "Profit (%)": profit,
        "Current Value": Utilities.numberWithCommas((item.currentPrice * item.numberShares).toFixed(2))
      };
    });
    
    var columnMetadata = [
      {
        columnName: "Symbol",
        visible: true,
        customComponent: SymbolComponent
      },
      {
        columnName: "Profit (%)",
        visible: true,
        customComponent: ProfitComponent
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
                  useGriddleStyles={true}
                  showFilter={true}
                  resultsPerPage={8}
                  noDataMessage="Loading stock data..." />
        </div>
      </div>
    );
  }
}

class SymbolComponent extends React.Component {
  render() {
    return(
      <div><strong>{this.props.data}</strong></div>
    );
  }
}

class ProfitComponent extends React.Component {
  render() {
    return(
      <div className={this.props.data >= 0 ? "text-success" : "text-danger"}><b>{(this.props.data * 100).toFixed(2)}</b></div>
    );
  }
}