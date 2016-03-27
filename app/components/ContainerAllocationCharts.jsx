import React from 'react';
import PlotlyGraph from './PlotlyGraph';

export default class ContainerAllocationCharts extends React.Component {
  render() {
    var assetAllocation = [];
    var stockAllocation = [];
    var stocks = this.props.stocks;
    if (stocks.length > 0) {
      var cashData = stocks.find(item => item.name === 'CASH');
      var stockData = stocks.filter(item => item.name !== 'CASH' && item.numberShares > 0);
      
      assetAllocation = [{
        values: [
          cashData.numberShares * cashData.purchasePrice,
          stockData.reduce( (previous, current) => previous + current.numberShares * current.currentPrice, 0)
        ],
        labels:['Cash','Stock'],
        type:'pie'
      }];
      
      stockAllocation = [{
        values: stockData.map(item => item.currentPrice * item.numberShares),
        labels: stockData.map(item => item.name),
        type:'pie',
        direction: 'clockwise'
      }];
    }
    
    var assetAllocationLayout = {
      title: "Asset Allocation",
      width: (jQuery(window).width() >= 1024 ? 455 : 420),
      autosize: true
    };
    
    var stockAllocationlayout = {
        title: "Stock Allocation",
        width: (jQuery(window).width() >= 1024 ? 455 : 420),
        autosize: true
    };
    
    return (
      <div className="row">
        <div className="col-sm-6">
          <PlotlyGraph data={assetAllocation} layout={assetAllocationLayout} />
        </div>
        <div className="col-sm-6">
          <PlotlyGraph data={stockAllocation} layout={stockAllocationlayout} />
        </div>
      </div>
    );
  }
}  