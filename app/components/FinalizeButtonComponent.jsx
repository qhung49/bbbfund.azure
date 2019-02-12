import React from 'react';
import Griddle from 'griddle-react';
import * as Utilities from './Utilities.js';
import moment from 'moment';

export default class FinalizeButtonComponent extends React.Component {
  handleSubmit(event) {
    event.preventDefault();
    
    console.log("Input data: " + this.props.data);
    var data = {
      transactionId: this.props.data.transactionId,
      endDate: moment().format('YYYY/MM/DD'),
      withdrawValue: parseFloat(this.refs.withdrawValue.value),
      originalValue: parseFloat(this.props.data.value)
    }
    
    if (isNaN(data.withdrawValue)) {
      alert("Invalid input");
    } else {
      this.props.data.finalizeInvestment(data);
    }
  }
  
  render() {
    return (
      <div className="btn-group">
        <button type="button" className="btn btn-success dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" disabled={this.props.rowData.End}>
          Finalize <span className="caret"></span>
        </button>
        <div className="dropdown-menu">
          <form className="form">
            <input className="form-control input-sm" ref="withdrawValue" type="text" placeholder="Withdraw Value" required />
            <button className="btn btn-success" type="submit" style={{width: "100%"}} onClick={this.handleSubmit.bind(this)}>Submit</button> 
          </form>
        </div>
      </div>
    );
  }
}