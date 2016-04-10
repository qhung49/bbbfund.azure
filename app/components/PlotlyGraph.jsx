import React from 'react';
import Plotly from 'plotly.js/lib/core';
import plolyPie from 'plotly.js/lib/pie';

Plotly.register([plolyPie]);

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
    return (
      <div ref = 'plotContainer' />
    );
  }
}