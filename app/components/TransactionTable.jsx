import React from 'react';
import Griddle from 'griddle-react';
import * as Utilities from './Utilities.js';
import FinalizeButtonComponent from './FinalizeButtonComponent';

export default class TransactionTable extends React.Component {
  
  render() {
    var investorTransactions = [];
    var stockTransactions = [];

    var investorTransactionsColumnMetadata = [
        {
          "columnName": "Investor",
          "order": 1,
          "locked": false,
          "visible": true
        },
        {
          "columnName": "Amount",
          "order": 2,
          "locked": false,
          "visible": true
        },
        {
          "columnName": "Start",
          "order": 3,
          "locked": false,
          "visible": true
        },
        {
          "columnName": "End",
          "order": 4,
          "locked": false,
          "visible": true
        },
        {
          "columnName": "Rate",
          "order": 5,
          "locked": false,
          "visible": true
        },
        {
          "columnName": "Action",
          "order": 6,
          "locked": false,
          "visible": true,
          "customComponent": FinalizeButtonComponent
        }
      ];
    var visibleColumns = ["Investor", "Amount", "Start", "End", "Rate"];
    if (this.props.loggedIn === 'admin')
    {
      visibleColumns.push("Action");
    }

    console.log( this.props);

    var temp = this.props.finalizeInvestment;
    if (this.props.data) {
      investorTransactions = this.props.data.investors.map(function(item) {        
        return {
          "Investor": item.name,
          "Amount": Utilities.numberWithCommas(item.value.toFixed(0)),
          "Start": (new Date(item.startDate)).toISOString().slice(0,10),
          "End": item.endDate === 0 ? "" : (new Date(item.endDate)).toISOString().slice(0,10),
          "Rate": item.rate.toFixed(2),
          "Action": {
            transactionId: item.transactionId,
            finalizeInvestment: temp.bind(this)
          }
        };
      });

      stockTransactions = this.props.data.stocks.map(function(item) {
        var details = null; JSON.stringify(item.properties);
        switch (item.type) {
          case 'buy':
          case 'sell':
            details = item.properties.numberShares + ' shares @ ' + item.properties.price;
            break;
          case 'dividend':
            details = item.properties.dividend;
            break;
          default:
            details = 'No details found';
        }
        return {
          "Timestamp": (new Date(item.created)).toISOString().slice(0,10),
          "Stock": item.stock,
          "Type": item.type.toUpperCase(),
          "Details": details,
        };
      });
    }
    
    return (
      <div className="row">
        <div className="col-xs-12">
          <div className="btn-group">
            <button className="btn btn-primary" type="button" data-toggle="collapse" data-target="#showTransactionsCollapse" onClick={this.props.getTransactions} aria-expanded="false" aria-controls="collapseExample">
              Show Transactions
            </button>
          </div>
        </div>
        <div className="collapse col-xs-12" id="showTransactionsCollapse">
          <Griddle results={investorTransactions} 
                   initialSort="Start" 
                   initialSortAscending={false} 
                   showFilter={true}
                   columnMetadata={investorTransactionsColumnMetadata}
                   columns={visibleColumns}
                   noDataMessage="Loading investor transaction data..." />
          <hr />
          <Griddle results={stockTransactions} 
                   initialSort="Timestamp" 
                   initialSortAscending={false} 
                   showFilter={true}
                   noDataMessage="Loading stock transaction data..." />
        </div>
      </div>
    );
  }
}