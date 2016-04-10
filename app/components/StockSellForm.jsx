import React from 'react';

export default class StockSellForm extends React.Component {  
  handleSubmit(event) {
    event.preventDefault();
    var sellData = {
      name: this.refs.stockName.value,
      numberShares: parseInt(this.refs.numberShares.value),
      price: parseFloat(this.refs.price.value)
    }
    
    if (isNaN(sellData.numberShares) || isNaN(sellData.price)) {
      this.props.handleError("Invalid input");
    }
    else {
      this.props.handleAction('sell', sellData); 
    }
  }
  
  render() {
    
    return (
      <div className="btn-group">
        <button type="button" className="btn btn-warning dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          Sell Stock <span className="caret"></span>
        </button>
        <div className="dropdown-menu">
          <form className="form">
            <input className="form-control input-sm" ref="stockName" type="text" placeholder="Stock Name" required />
            <input className="form-control input-sm" ref="price" type="text" placeholder="Price (x1000 VND)" required />
            <input className="form-control input-sm" ref="numberShares" type="text" placeholder="Number of shares" required />
            <button className="btn btn-primary" type="submit" style={{width: "100%"}} onClick={this.handleSubmit.bind(this)}>Submit</button> 
          </form>
        </div>
      </div>     
    )
  }
}