import React from 'react';

export default class StockAddDividendForm extends React.Component {
  handleSubmit(event) {
    event.preventDefault();
    var data = {
      name: this.refs.stockName.value,
      dividend: parseInt(this.refs.dividend.value)
    }
    
    if (isNaN(data.dividend)) {
      this.props.handleError("Invalid input");
    }
    else {
      this.props.handleAction('dividend', data); 
    }
  }
  
  render() {
    return (
      <div className="btn-group">
        <button type="button" className="btn btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          Receive Dividend <span className="caret"></span>
        </button>
        <div className="dropdown-menu">
          <form className="form">
            <input className="form-control input-sm" ref="stockName" type="text" placeholder="Stock Name" required />
            <input className="form-control input-sm" ref="dividend" type="text" placeholder="Dividend (x1000 VND)" required />
            <button className="btn btn-primary" type="submit" style={{width: "100%"}} onClick={this.handleSubmit.bind(this)}>Submit</button>
          </form>
        </div>
      </div>     
    )
  }
}