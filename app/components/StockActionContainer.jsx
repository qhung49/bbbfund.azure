import React from 'react';
import StockBuyForm from './StockBuyForm';
import StockSellForm from './StockSellForm';
import StockAddDividendForm from './StockAddDividendForm';

export default class StockActionContainer extends React.Component {
  
  constructor(props) {
    super(props);
    
    this.state = {
      alertMessage: null
    }
  }
  
  handleError(errorMessage) {
    this.setState({
        alertMessage: errorMessage
      });
  }
  
  handleAction(type, data) {
    this.props.handleStockAction(type, data)
      .catch(function(err) {
        this.setState({
          alertMessage: err
        })
      }.bind(this));
  }
  
  render() {
    var alertComponent = null;
    if (this.state.alertMessage) {
      alertComponent = (
        <div className="col-xs-12">
          <div className="alert alert-danger" role="alert">
            {this.state.alertMessage}
          </div>
        </div>
      );
    }
    
    return (
      <div className="row">
        {alertComponent}
        <div className="col-xs-12">
          <StockBuyForm handleAction={this.handleAction.bind(this)} handleError={this.handleError.bind(this)} />
          <StockSellForm handleAction={this.handleAction.bind(this)} handleError={this.handleError.bind(this)} />
          <StockAddDividendForm handleAction={this.handleAction.bind(this)} handleError={this.handleError.bind(this)} />
        </div>
      </div>
    );
  }
}