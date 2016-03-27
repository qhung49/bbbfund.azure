import React from 'react';
import Plotly from 'plotly.js';

export default class PlotlyGraph extends React.Component {
  
  componentDidMount() {
    Plotly.plot(this.refs.plotContainer, this.props.data, this.props.layout, this.props.config);
  }
  
  componentDidUpdate() {
    this.refs.plotContainer.data = this.props.data;
    this.refs.plotContainer.layout = this.props.layout;
    Plotly.redraw(this.refs.plotContainer);
  }
  
  render() {
    var className = "col-sm-";
    if (this.props.layout.width <= 500) {
      className += "6";
    }
    else {
      className += "12"; 
    }
      
    return (
      <div ref = 'plotContainer' className={className} />
    );
  }
}