import React from 'react';
import Griddle from 'griddle-react';
import * as Utilities from './Utilities.js';

export default class InvestorTable extends React.Component {
  
  render() {
    var results = this.props.data.filter(item => item.investorId !== 1).map( function(item) {
      return {
        "Name": item.name,
        "Total": item.total,
        "Estimated Profit": item.estimatedProfit.toLocaleString()
      };
    });
    
    var columnMetadata = [
      {
        columnName: "Total",
        visible: true,
        customComponent: TotalComponent
      }
    ];
    
    return (
      <div className="row">
        <div className="col-xs-12">
          <h2 className="page-header">Investors</h2>
          <Griddle results={results} 
                initialSort="Total" 
                initialSortAscending={false} 
                showFilter={false} 
                columnMetadata={columnMetadata}
                noDataMessage="Loading investor data..." />
        </div>
      </div>
    );
  }
}

class TotalComponent extends React.Component {
  render() {
    return(
      <div>{Utilities.numberWithCommas(this.props.data)}</div>
    );
  }
} 