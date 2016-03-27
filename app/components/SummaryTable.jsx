import React from 'react';
import * as Utilities from './Utilities.js';

export default class SummaryTable extends React.Component {
  render() {
    return (
      <table className="table table-striped table-bordered">
        <caption>Summary</caption>
        <tbody> 
          <tr> 
            <td>Stock Purchase Price</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.stockPurchaseValue.toFixed(2))}</td> 
          </tr> 
          <tr> 
            <td>Stock Current Market Price</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.stockCurrentValue.toFixed(2))}</td> 
          </tr>
          <tr> 
            <td>Cash</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.cash.toFixed(2))}</td> 
          </tr>
          <tr> 
            <td>Capital</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.capital.toFixed(2))}</td> 
          </tr>
          <tr> 
            <td>Profit</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.profit.toFixed(2))}</td> 
          </tr>
          <tr> 
            <td>Fee</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.fee.toFixed(2))}</td> 
          </tr>
          <tr> 
            <td>Dividend</td><td className="text-right">{Utilities.numberWithCommas(this.props.data.dividend.toFixed(2))}</td> 
          </tr>
        </tbody>
      </table>
    );
  }
}