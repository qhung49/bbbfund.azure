import React from 'react';
import PlotlyGraph from './PlotlyGraph';

export default class IndexPerformanceGraph extends React.Component {
  render() {
    var graphData = [];
    var displayTimestamps = this.props.data.timestamp;
    this.props.data.markets.forEach( market => {
      graphData.push({
        type:"scatter",
        name: market.name,
        "x":displayTimestamps,
        "y":market.index
      });
    });
    
    var layoutWidth = 480;
    if (jQuery(window).width() >= 768) {
      if (jQuery(window).width() >= 1024) {
        layoutWidth = 1170;
      } 
      else {
        layoutWidth = 748;
      }
    }
    var layout = {
      "yaxis":{
        "title":"Index",
        "type":"linear",
        "autorange":true
      },
      "xaxis":{
        "showticklabels":false,
        "showgrid":true,
        "title":"Day",
        "type":"category",
        "autorange":true
      },
      "title":"BBBIndex Graph",
      width: layoutWidth,
      height: layoutWidth * 0.7,
    };
    
    return (
      <PlotlyGraph data={graphData} layout={layout} />
    );
  }
}